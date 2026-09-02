using System;
using System.Collections;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Reflection;
using System.Resources;
using System.Windows.Forms;

namespace PaintDotNet
{
    /// <summary>
    /// Summary description for PencilTool.
    /// </summary>
    public class PencilTool
        : Tool 
    {
        private bool mouseDown = false;
        private MouseButtons mouseButton;
        private ArrayList savedSurfaces;
        private BitmapLayer bitmapLayer;
        private RenderArgs renderArgs;
        private ArrayList tracePoints;
		private Pen pen;
		private PdnRegion clipRegion;
		private Point lastPoint;
		private Point difference;
        private Cursor pencilToolCursor;
		private Cursor cursorMouseDownPickColor;

		private Keys modifierDown;

        protected override void OnActivate()
        {
            base.OnActivate();

			Cursor = this.pencilToolCursor;
			mouseDown = false;
			modifierDown = 0;
			
			savedSurfaces = new ArrayList();

            if (Workspace.ActiveLayer != null)
            {
                bitmapLayer = (BitmapLayer)Workspace.ActiveLayer;
                renderArgs = new RenderArgs(bitmapLayer.Surface);
                tracePoints = new ArrayList();
                pen = null;
            }
            else
            {
                bitmapLayer = null;
                Utility.Dispose(renderArgs);
                renderArgs = null;
                pen = null;
            }
        }

        protected override void OnDeactivate()
        {
            base.OnDeactivate();

            if (mouseDown)
            {
                Point lastPoint = (Point)tracePoints[tracePoints.Count - 1];
                OnMouseUp(new MouseEventArgs(mouseButton, 0, lastPoint.X, lastPoint.Y, 0));
            }

            if (savedSurfaces != null)
            {
                foreach (PlacedSurface ps in savedSurfaces)
                {
                    ps.Dispose();
                }

                savedSurfaces.Clear();
                savedSurfaces = null;
            }

            tracePoints = null;
            bitmapLayer = null;

            if (renderArgs != null)
            {
                renderArgs.Dispose();
                renderArgs = null;
            }

            mouseDown = false;

            if (pen != null)
            {
                pen.Dispose();
                pen = null;
            }

			Utility.Dispose(clipRegion);
        }


		// Draws a point, but first intersects it with the selections
		private void DrawPoint(RenderArgs ra, Point p, ColorBgra color)
		{
            if (Utility.IsPointInRectangle(p, ra.Surface.Bounds))
            {
                if (ra.Graphics.IsVisible(p))
                {
					if(((BitmapLayer)Workspace.ActiveLayer).GetRestrictMode.IsDoublePixel())
					{
						p.X -= p.X%2; // HACK, double pixels
						ra.Surface[p.X, p.Y] = color;
						ra.Surface[p.X+1, p.Y] = color;
					}
					else
					{
						ra.Surface[p.X, p.Y] = color;
					}
                }
            }
		}

        private void DrawLines(RenderArgs ra, ArrayList points, int startIndex, int length, Pen pen, Point currentMouse)
        {
			// Draw a point in the line
			if (points.Count == 0)
			{
				return;
			}
			else if (points.Count == 1)
			{
				Point p = (Point)points[0];

				if (Utility.IsPointInRectangle(p, ra.Surface.Bounds))
				{
					DrawPoint(ra,p,ColorBgra.FromColor(pen.Color));
				}
			}
			else
			{
				ColorBgra color = ColorBgra.FromColor(pen.Color);

				for (int i = 1; i < points.Count; ++i)
				{
					Point[] linePoints = Utility.GetLinePoints((Point)points[i - 1], (Point)points[i]);
					int startPoint = 0;

					if (i != 1)
					{
						startPoint = 1;
					}

					for (int pi = startPoint; pi < linePoints.Length; ++pi)
					{
						Point p = linePoints[pi];
						DrawPoint(ra,p,color);
					}
				}
			}		
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

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);

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
					mouseButton = e.Button;
					tracePoints = new ArrayList();
					bitmapLayer = (BitmapLayer)Workspace.ActiveLayer;
					renderArgs = new RenderArgs(bitmapLayer.Surface);

					if (!Workspace.Environment.IsSelectionEmpty)
					{
						clipRegion = Workspace.Environment.CreateSelectedRegion();
					}
					else
					{
						clipRegion = new PdnRegion();
						clipRegion.MakeInfinite();
					}

					renderArgs.Graphics.SetClip(clipRegion, CombineMode.Replace);
					OnMouseMove(e);
				}
				else
				{
					mouseButton = e.Button;
					modifierDown = ModifierKeys;
					OnMouseMove(e);
				}
            }
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);

			// PickColor(e); // HACK, HACK, HACK, THIS WORKS!!!
			// this.Workspace.Environment.ForeColor = LiftColor(e.X, e.Y);

            if (mouseDown && ((e.Button & mouseButton) != MouseButtons.None))
            {
				if (modifierDown == 0)
				{
					Point mouseXY = new Point(e.X, e.Y);

					if (lastPoint == Point.Empty)
					{
						lastPoint = mouseXY;
					}

					difference = new Point(mouseXY.X - lastPoint.X, mouseXY.Y - lastPoint.Y);

					if (tracePoints.Count > 0) 
					{
						Point lastMouseXY = (Point)tracePoints[tracePoints.Count - 1];
						if (lastMouseXY == mouseXY) 
						{
							return;
						}
					}

					if (pen == null)
					{
						PenInfo pi = Workspace.Environment.PenInfo;
						pi.Width = 1.0f;

						if ((mouseButton & MouseButtons.Left) == MouseButtons.Left)
						{
							pen = pi.CreatePen(new BrushInfo(BrushType.Solid, HatchStyle.BackwardDiagonal),
								Workspace.Environment.ForeColor.ToColor(), Workspace.Environment.BackColor.ToColor());
						}
						else if ((mouseButton & MouseButtons.Right) == MouseButtons.Right)
						{   // right mouse button = swap foreground/background
							pen = pi.CreatePen(new BrushInfo(BrushType.Solid, HatchStyle.BackwardDiagonal),
								Workspace.Environment.BackColor.ToColor(), Workspace.Environment.ForeColor.ToColor());
						}
					}

					if (!(tracePoints.Count > 0 && mouseXY == (Point)tracePoints[tracePoints.Count - 1]))
					{
						tracePoints.Add(mouseXY);
					}

					if (Workspace.ActiveLayer is BitmapLayer)
					{
						Rectangle saveRect;

						if (tracePoints.Count == 1)
						{
							saveRect = Utility.PointsToRectangle(mouseXY, mouseXY);
						}
						else
						{   // >1 points
							saveRect = Utility.PointsToRectangle((Point)tracePoints[tracePoints.Count - 1], (Point)tracePoints[tracePoints.Count - 2]);
						}

						saveRect.Inflate(2,2);
						saveRect.Intersect(Workspace.ActiveLayer.Bounds);

						// drawing outside of the canvas is a no-op, so don't do anything in that case!
						// also make sure it's within the clipping bounds
						if (saveRect.Width > 0 && saveRect.Height > 0 && renderArgs.Graphics.IsVisible(saveRect))
						{
							pen.LineJoin = LineJoin.Round;
							PlacedSurface savedPI = new PlacedSurface(renderArgs.Surface, saveRect);
							savedSurfaces.Add(savedPI);

							int startIndex;
							int length;

							if (tracePoints.Count == 1)
							{
								startIndex = 0;
								length = 1;
							}
							else
							{
								startIndex = tracePoints.Count - 2;
								length = 2;
							}

							DrawLines(this.renderArgs, tracePoints, startIndex, length, pen, mouseXY);

							bitmapLayer.Invalidate(saveRect);
							Workspace.Update();
						}
					}
					else
					{
						// will have to do something here if we add other layer types besides BitmapLayer
					}
					lastPoint = mouseXY;
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

        protected override void OnMouseUp(MouseEventArgs e)
        {
            base.OnMouseUp(e);

			if (!KeyDownControlOnly())
			{
				Cursor = this.pencilToolCursor;
			}
			
			if (mouseDown)
            {
                OnMouseMove(e);
                mouseDown = false;

                if (savedSurfaces.Count > 0)
                {
                    PdnRegion saveMeRegion = new PdnRegion();
                    saveMeRegion.MakeEmpty();

                    foreach (PlacedSurface pi1 in savedSurfaces)
                    {
                        saveMeRegion.Union(pi1.Bounds);
                    }

                    PdnRegion simplifiedRegion = Utility.SimplifyAndInflateRegion(saveMeRegion);

                    // draw in *reverse* order: that's why we don't use foreach
                    for (int i = savedSurfaces.Count - 1; i >= 0; --i)
                    {
                        PlacedSurface pi = (PlacedSurface)savedSurfaces[i];
                        pi.Draw(renderArgs.Surface);
                        pi.Dispose();
                    }

                    savedSurfaces.Clear();

                    //HistoryAction ha = bitmapLayer.CreateHistoryAction(Name, Image, simplifiedRegion);
                    HistoryAction ha = new BitmapHistoryAction(Name, Image, Workspace, Workspace.ActiveLayerIndex, simplifiedRegion);
                    DrawLines(renderArgs, tracePoints, 0, tracePoints.Count, pen,new Point(e.X,e.Y));
                    bitmapLayer.Invalidate(simplifiedRegion);
                    Workspace.History.PushNewAction(ha);

                    simplifiedRegion.Dispose();
                    saveMeRegion.Dispose();
                }

                tracePoints = null;
                Utility.Dispose(pen);
                pen = null;
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
					this.Cursor = this.pencilToolCursor;
				}
			}
		}

        public PencilTool(DocumentWorkspace parent)
            : base(parent,
                   Utility.GetImageResource("Icons.PencilToolIcon.bmp"),
                   "Pencil",
                   "Draws a freeform, one-pixel wide line.",
                   "Left click to draw freeform, one-pixel wide lines with the foreground color, right click to use the background color",
                   'p')
        {
            this.pencilToolCursor = new Cursor(Utility.GetResourceStream("Cursors.LineToolCursor.cur"));
            this.Cursor = this.pencilToolCursor;

            // initialize any state information you need
            mouseDown = false;
			cursorMouseDownPickColor = new Cursor(Utility.GetResourceStream("Cursors.RecoloringToolCursorPickColor.cur"));
		}

        protected override void Dispose(bool disposing)
        {
            base.Dispose (disposing);

            if (disposing)
            {
                DisposeImage();

                if (this.pencilToolCursor != null)
                {
                    this.pencilToolCursor.Dispose();
                    this.pencilToolCursor = null;
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
