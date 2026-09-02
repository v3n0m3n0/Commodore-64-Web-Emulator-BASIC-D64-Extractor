using System;
using System.Collections;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Reflection;
using System.Resources;
using System.Windows.Forms;

namespace PaintDotNet
{
    /// <summary>
    /// Allows the user to draw a shape that can be defined using two points on the canvas.
    /// The user clicks and drags between two points to define the area that bounds the shape.
    /// </summary>
    public abstract class ShapeTool
        : Tool
    {
        private bool mouseDown;
        private MouseButtons mouseButton;
        private BitmapLayer bitmapLayer;
        private RenderArgs renderArgs;
        private IrregularSurface interiorSaveSurface;
        private IrregularSurface outlineSaveSurface;
        private ArrayList points;
		private PdnRegion lastDrawnRegion = null;
		private Cursor cursorMouseUp;
        private Cursor cursorMouseDown;
		private Cursor cursorMouseDownPickColor;
		private Keys modifierDown;


        protected override bool SupportsInk
        {
            get
            {
                return true;
            }
        }

        // This is for shapes that should only be draw in one ShapeDrawType
        // The line shape, for instance, should only ever be drawn in ShapeDrawType.Outline
        private bool forceShapeType = false;
        public bool ForceShapeDrawType
        {
            get
            {
                return forceShapeType;
            }

            set
            {
                forceShapeType = value;
            }
        }

        private ShapeDrawType forcedShapeDrawType = ShapeDrawType.Both;
        public ShapeDrawType ForcedShapeDrawType
        {
            get
            {
                return forcedShapeDrawType;
            }

            set
            {
                forcedShapeDrawType = value;
            }
        }


        /// <summary>
        /// Different shapes may not require all the points given to them, and as such
        /// if the user is drawing for a long time there may be lots of memory that's
        /// allocated that doesn't need to be. So before CreateShapePath is called,
        /// this method is called first.
        /// For example, the LineTool would return a new array containing only the
        /// first and last points.
        /// It is ok to return the same array that was passed in, even if it is modified.
        /// </summary>
        /// <param name="points">An ArrayList containing PointF instances.</param>
        /// <returns></returns>
        protected virtual ArrayList TrimShapePath(ArrayList points)
        {
            return points;
        }

        /// <summary>
        /// Override this function to return an "optimized" region that encompasses 
        /// the shape's outline. For example, a circle would return a list of rectangles
        /// that traces the outline. This is necessary because normally simplification
        /// will produce a region that, for a circle's outline, encompasses its
        /// interior as well. If you return null, then the default simplification
        /// algorithm will be used.
        /// </summary>
        /// <param name="points"></param>
        /// <param name="path"></param>
        /// <returns></returns>
        protected virtual RectangleF[] GetOptimizedShapeOutlineRegion(PointF[] points, PdnGraphicsPath path)
        {
            return null;
        }

        // Implement this!
        protected abstract PdnGraphicsPath CreateShapePath(PointF[] points);

        protected override void OnActivate()
        {
            base.OnActivate();

            outlineSaveSurface = null;
            interiorSaveSurface = null;

            // creates a bitmap layer from the active layer
            bitmapLayer = (BitmapLayer)Workspace.ActiveLayer;

            // create Graphics object
            renderArgs = new RenderArgs(bitmapLayer.Surface);

            lastDrawnRegion = new PdnRegion();
            lastDrawnRegion.MakeEmpty();

			modifierDown = 0;
        }

        protected override void OnDeactivate()
        {
            base.OnDeactivate();

            if (mouseDown)
            {
                PointF lastPoint = (PointF)points[points.Count - 1];
                OnStylusUp(new StylusEventArgs(mouseButton, 0, lastPoint.X, lastPoint.Y, 0));
            }

            bitmapLayer = null;

            if (renderArgs != null)
            {
                renderArgs.Dispose();
            }

            renderArgs = null;

            if (outlineSaveSurface != null)
            {
                outlineSaveSurface.Dispose();
            }

            outlineSaveSurface = null;

            if (interiorSaveSurface != null)
            {
                interiorSaveSurface.Dispose();
            }

            interiorSaveSurface = null;

            points = null;
        }

		private ColorBgra LiftColor(int x, int y)
		{
			return ((BitmapLayer)this.Workspace.ActiveLayer).Surface[x, y];
		}

		private void PickColor(MouseEventArgs e)
		{
			if (!Utility.IsPointInRectangle(e.X, e.Y, Workspace.Document.Bounds))
			{
				return;
			}

			if (BtnDownMouseLeft(e) || BtnDownMouseRight(e))
			{
				if (BtnDownMouseLeft(e))
				{
					this.Workspace.Environment.ForeColor = LiftColor(e.X, e.Y);
				}
				else
				{
					this.Workspace.Environment.BackColor = LiftColor(e.X, e.Y);
				}
			}
			else
			{
				return;
			}
		}

		/// <summary>
		/// Button down mouse left.  Returns true if only the left mouse button is depressed.
		/// </summary>
		/// <param name="e"></param>
		/// <returns></returns>
		private bool BtnDownMouseLeft(MouseEventArgs e)
		{
			return(e.Button == MouseButtons.Left);
		}

		/// <summary>
		/// Button down mouse right.  Returns true if only the right mouse is depressed.
		/// </summary>
		/// <param name="e"></param>
		/// <returns></returns>
		private bool BtnDownMouseRight(MouseEventArgs e)
		{
			return(e.Button == MouseButtons.Right);
		}

        protected override void OnStylusDown(StylusEventArgs  e)
        {
            base.OnStylusDown(e);

            if (mouseDown)
            {
                return;
            }

            if (((e.Button & MouseButtons.Left) == MouseButtons.Left) ||
                ((e.Button & MouseButtons.Right) == MouseButtons.Right))
            {
                mouseDown = true;

				if (!KeyDownControlOnly())
				{
					cursorMouseUp = Cursor;
					Cursor = cursorMouseDown;

					mouseButton = e.Button;

					PdnRegion clipRegion = null;
                
					if (!Workspace.Environment.IsSelectionEmpty)
					{
						clipRegion = Workspace.Environment.CreateSelectedRegion();
					}
					else
					{
						clipRegion = new PdnRegion(Workspace.Document.Bounds);
					}

					renderArgs.Graphics.SetClip(clipRegion, CombineMode.Replace);
					clipRegion.Dispose();

					// reset the points we're drawing!
					points = new ArrayList();

					OnStylusMove(e);
				}
				else
				{
					mouseButton = e.Button;
					modifierDown = ModifierKeys;

					// OnStylusMove(e);
					OnMouseMove(e);
				}
			}
        }

        protected override void OnStylusMove(StylusEventArgs e)
        {
            base.OnStylusMove (e);

            if (mouseDown && ((e.Button & mouseButton) != MouseButtons.None))
            {
				if (modifierDown == 0)
				{
					PointF mouseXY = new PointF(e.Fx, e.Fy);
					points.Add(mouseXY);
				}
				else
				{
					switch (modifierDown & (Keys.Control | Keys.Shift))
					{
						case Keys.Control: PickColor(e);
							break;

						default: 
							break;
					}
				}
            }
        }

        public virtual PixelOffsetMode GetPixelOffsetMode()
        {
            return PixelOffsetMode.Half;
        }

        private void Render()
        {
            // create the Pen we will use to draw with
            Pen outlinePen = null;
            Brush interiorBrush = null;
            PenInfo pi = Workspace.Environment.PenInfo;
            BrushInfo bi = Workspace.Environment.BrushInfo;

            // Initialize pens and brushes to the correct colors
            if ((mouseButton & MouseButtons.Left) == MouseButtons.Left)
            {
                outlinePen = pi.CreatePen(Workspace.Environment.BrushInfo,
                    Workspace.Environment.ForeColor.ToColor(), Workspace.Environment.BackColor.ToColor());
                
                interiorBrush = bi.CreateBrush(Workspace.Environment.BackColor.ToColor(), Workspace.Environment.ForeColor.ToColor());
            }
            else if ((mouseButton & MouseButtons.Right) == MouseButtons.Right)
            {
                outlinePen = pi.CreatePen(Workspace.Environment.BrushInfo,
                    Workspace.Environment.BackColor.ToColor(), Workspace.Environment.ForeColor.ToColor());

                interiorBrush = bi.CreateBrush(Workspace.Environment.ForeColor.ToColor(), Workspace.Environment.BackColor.ToColor());
            }

            outlinePen.LineJoin = LineJoin.MiterClipped;
            outlinePen.MiterLimit = 2;

            // redraw the old saveSurface
            if (interiorSaveSurface != null)
            {
                interiorSaveSurface.Draw(bitmapLayer.Surface);
                bitmapLayer.Invalidate(interiorSaveSurface.Region);
                interiorSaveSurface.Dispose();
                interiorSaveSurface = null;
            }

            if (outlineSaveSurface != null)
            {
                outlineSaveSurface.Draw(bitmapLayer.Surface);
                bitmapLayer.Invalidate(outlineSaveSurface.Region);
                outlineSaveSurface.Dispose();
                outlineSaveSurface = null;
            }

            // anti-aliasing? Don't mind if I do
            if (Workspace.Environment.AntiAliasing)
            {
                renderArgs.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            }
            else
            {
                renderArgs.Graphics.SmoothingMode = SmoothingMode.None;
            }

            // also set the pixel offset mode
            renderArgs.Graphics.PixelOffsetMode = GetPixelOffsetMode();

            // figure out how we're going to draw
            ShapeDrawType drawType;

            if (ForceShapeDrawType)
            {
                drawType = ForcedShapeDrawType;
            }
            else
            {
                drawType = Workspace.Environment.ShapeDrawType;
            }

            // get the region we want to save
            points = this.TrimShapePath(points);
            PointF[] pointsArray = (PointF[])points.ToArray(typeof(PointF));
            PdnGraphicsPath shapePath = CreateShapePath(pointsArray);

			// HACK, added for double pixel support
			PointF[] pointsArray2 = (PointF[])points.ToArray(typeof(PointF));
			for(int i =0; i<pointsArray2.Length; i++)
				pointsArray2[i].X -= 1;
			PdnGraphicsPath shapePath2 = CreateShapePath(pointsArray2);

            if (shapePath != null)
            {
                // create non-optimized interior region
                PdnRegion interiorRegion = new PdnRegion(shapePath);

                // create non-optimized outline region
                PdnRegion outlineRegion;

                using (PdnGraphicsPath outlinePath = (PdnGraphicsPath)shapePath.Clone())
                {
                    outlinePath.Widen(outlinePen);
                    outlineRegion = new PdnRegion(outlinePath);
                }

                // create optimized outlineRegion for purposes of rendering, if it is possible to do so
                // shapes will often provide an "optimized" region that circumvents the fact that
                // we'd otherwise get a region that encompasses the outline *and* the interior, thus
                // slowing rendering significantly in many cases.
                RectangleF[] optimizedOutlineRegion = GetOptimizedShapeOutlineRegion(pointsArray, shapePath);
                PdnRegion invalidOutlineRegion;

                if (optimizedOutlineRegion != null)
                {
                    Utility.InflateRectanglesInPlace(optimizedOutlineRegion, (int)(outlinePen.Width + 2));
                    invalidOutlineRegion = Utility.RectanglesToRegion(optimizedOutlineRegion);
                }
                else
                {
                    invalidOutlineRegion = Utility.SimplifyAndInflateRegion(outlineRegion, Utility.DefaultSimplificationFactor, 2);
                }

                // create optimized interior region
                PdnRegion invalidInteriorRegion = Utility.SimplifyAndInflateRegion(interiorRegion, Utility.DefaultSimplificationFactor, 3);

                PdnRegion invalidRegion = new PdnRegion();
                invalidRegion.MakeEmpty();

                // set up alpha blending
				renderArgs.Graphics.CompositingMode = Workspace.Environment.GetCompositingMode();

				/*
				if(Workspace.Environment.AntiAliasing)
					renderArgs.Graphics.CompositingMode = CompositingMode.SourceOver; // HACK, was SourceOver
				else
					renderArgs.Graphics.CompositingMode = CompositingMode.SourceCopy; // HACK, was SourceOver
				*/

				outlineSaveSurface = new IrregularSurface(bitmapLayer.Surface, invalidOutlineRegion);

				// draw shape
				if ((drawType & ShapeDrawType.Interior) != 0)
				{
					interiorSaveSurface = new IrregularSurface(bitmapLayer.Surface, invalidInteriorRegion);
					renderArgs.Graphics.FillPath(interiorBrush, shapePath);
				}
				
				if ((drawType & ShapeDrawType.Outline) != 0)
                {
                    renderArgs.Graphics.DrawPath(outlinePen, shapePath);

					// HACK, added double pixel support
					if(((BitmapLayer)Workspace.ActiveLayer).GetRestrictMode.IsDoublePixel())
						renderArgs.Graphics.DrawPath(outlinePen, shapePath2);
                }

				invalidRegion.Union(invalidOutlineRegion);

				if ((drawType & ShapeDrawType.Interior) != 0)
					invalidRegion.Union(invalidInteriorRegion);
				
				bitmapLayer.Invalidate(invalidRegion);
                invalidRegion.Dispose();

                invalidInteriorRegion.Dispose();
                invalidOutlineRegion.Dispose();
                outlineRegion.Dispose();
                interiorRegion.Dispose();
            }

            Workspace.Update();
            Utility.Dispose(shapePath);
            outlinePen.Dispose();
            interiorBrush.Dispose();
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);

            // if mouse button not down then leave function
            if (mouseDown && ((e.Button & mouseButton) != MouseButtons.None))
            {
				if(modifierDown == 0)
				{
					Render();
				}
            }
        }

        protected override void OnStylusUp(StylusEventArgs e)
        {
            base.OnStylusUp(e);

			if (!KeyDownControlOnly())
			{
				Cursor = cursorMouseUp;
			}

            if (mouseDown)
            {
                mouseDown = false;

                ArrayList has = new ArrayList();
                PdnRegion activeRegion;

                if (Workspace.Environment.IsSelectionEmpty)
                {
                    activeRegion = new PdnRegion();
                }
                else
                {
                    activeRegion = Workspace.Environment.CreateSelectedRegion();
                }

                if (outlineSaveSurface != null)
                {
                    using (PdnRegion clipTest = activeRegion.Clone())
                    {
                        clipTest.Intersect(outlineSaveSurface.Region);
                    
                        if (!clipTest.IsEmpty())
                        {
                            //has.Add(bitmapLayer.CreateHistoryAction(Name, Image, outlineSaveSurface));
                            has.Add(new BitmapHistoryAction(Name, Image, this.Workspace, this.Workspace.ActiveLayerIndex, outlineSaveSurface));
                            outlineSaveSurface.Dispose();
                            outlineSaveSurface = null;
                        }
                    }
                }

                if (interiorSaveSurface != null)
                {
                    using (PdnRegion clipTest = activeRegion.Clone())
                    {
                        clipTest.Intersect(interiorSaveSurface.Region);
                        
                        if (!clipTest.IsEmpty())
                        {
                            //has.Add(bitmapLayer.CreateHistoryAction(Name, Image, interiorSaveSurface));
                            has.Add(new BitmapHistoryAction(Name, Image, this.Workspace, this.Workspace.ActiveLayerIndex, interiorSaveSurface));
                            interiorSaveSurface.Dispose();
                            interiorSaveSurface = null;
                        }
                    }
                }

                if (has.Count > 0)
                {
                    CompoundHistoryAction cha = new CompoundHistoryAction(Name, Image, (HistoryAction[])has.ToArray(typeof(HistoryAction)));
                    Workspace.History.PushNewAction(cha);
                }

                activeRegion.Dispose();
                points = null;
                Workspace.Update();
            }
        }

		private bool KeyDownControlOnly()
		{
			return(ModifierKeys == Keys.Control);
		}

		protected override void OnKeyDown(KeyEventArgs e)
		{
			if (modifierDown == Keys.Control)
			{
				return;
			}
			else
			{
				if (!mouseDown)
				{
					if (KeyDownControlOnly())
					{
						cursorMouseUp = Cursor;
						this.Cursor = cursorMouseDownPickColor;
					}
				}
			}
		}

		protected override void OnKeyUp(KeyEventArgs e)
		{
			if (!KeyDownControlOnly())
			{
				if (!mouseDown)
				{
					modifierDown = 0;
					this.Cursor = cursorMouseUp;
				}
			}
		}

        public ShapeTool(DocumentWorkspace parent,
                         Image toolBarImage,
                         string name,
                         string description,
                         string helpText)
            : this(parent,
                   toolBarImage,
                   name,
                   description,
                   helpText,
                   'o')
        {
        }

        public ShapeTool(DocumentWorkspace parent,
                         Image toolBarImage,
                         string name,
                         string description,
                         string helpText,
                         char hotKey)
            : base(parent,
                   toolBarImage,
                   name,
                   description,
                   helpText,
                   hotKey)
        {
            mouseDown = false;
            points = null;

			cursorMouseUp = new Cursor(Utility.GetResourceStream("Cursors.ShapeToolCursor.cur")); 
			cursorMouseDown = new Cursor(Utility.GetResourceStream("Cursors.ShapeToolCursorMouseDown.cur"));
			cursorMouseDownPickColor = new Cursor(Utility.GetResourceStream("Cursors.RecoloringToolCursorPickColor.cur"));
		}

        protected override void Dispose(bool disposing)
        {
            base.Dispose (disposing);

            if (disposing)
            {
                if (cursorMouseUp != null)
                {
                    cursorMouseUp.Dispose();
                    cursorMouseUp = null;
                }

                if (cursorMouseDown != null)
                {
                    cursorMouseDown.Dispose();
                    cursorMouseDown = null;
                }
				if (cursorMouseDownPickColor != null)
				{
					cursorMouseDownPickColor.Dispose();
					cursorMouseDownPickColor = null;
				}
			}
        }
    }
}
