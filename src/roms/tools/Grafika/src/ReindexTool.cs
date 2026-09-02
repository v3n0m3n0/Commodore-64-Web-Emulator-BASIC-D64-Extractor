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
    public class ReindexTool
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
        private Cursor pencilToolCursor;
		private Cursor cursorMouseDownPickColor;
		private Point lastPoint;
		private Point difference;

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

		private void SwapColors(Point p, int index)
		{
			int x = p.X/8;
			int a, b, c, temp;
			int ypos;
			BitmapLayer bmpl;

			bmpl = (BitmapLayer)this.Workspace.ActiveLayer;

			if(bmpl.GetRestrictMode.GetType() == typeof(RestrictModes.FLI8RestrictMode) ||
				bmpl.GetRestrictMode.GetType() == typeof(RestrictModes.AFLI8RestrictMode))
			{
				ypos = p.Y;
			}
			else if(bmpl.GetRestrictMode.GetType() == typeof(RestrictModes.AFLI4RestrictMode))
			{
				ypos = (int)(p.Y/8 * 8 + 4 + (p.Y%8) / 2);
			}
			else
			{
				ypos = p.Y-p.Y%8;
			}

			if(x >= 0 && p.Y >= 0 && x < bmpl.ColorSurface.Width && p.Y < bmpl.CharlowSurface.Height)
			{
				ColorBgra c0 = bmpl.ColorSurface[x, p.Y/8];
				ColorBgra c1 = bmpl.CharlowSurface[x,ypos];
				ColorBgra c2 = bmpl.CharhighSurface[x,ypos];

				ColorBgra args = bmpl.ArgSurface[x,ypos];

				a = (args.B & 3);
				b = (args.B & 12)>>2;
				c = (args.B & 48)>>4;

				if(index == 0)
				{
					temp = a; a = b; b = temp;
				}
				else
				{
					temp = b; b = c; c = temp;
				}

				args.B = (byte)(a + (b<<2) + (c<<4));

				bmpl.ArgSurface[x,ypos] = args;
			}
		}

        private void DrawLines(Point currentMouse, int index)
        {
			SwapColors(currentMouse, index);
        }

		private bool BtnDownMouseLeft(MouseEventArgs e)
		{
			return(e.Button == MouseButtons.Left);
		}

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
			int index;

			base.OnMouseMove(e);

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

					index = 0;

					if ((mouseButton & MouseButtons.Left) == MouseButtons.Left)
					{
						index = 0;
					}
					else if ((mouseButton & MouseButtons.Right) == MouseButtons.Right)
					{
						index = 1;
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

						if (saveRect.Width > 0 && saveRect.Height > 0 && renderArgs.Graphics.IsVisible(saveRect))
						{
							PlacedSurface savedPI = new PlacedSurface(renderArgs.Surface, saveRect);
							savedSurfaces.Add(savedPI);

							DrawLines(mouseXY, index);

							bitmapLayer.Invalidate(saveRect);
							Workspace.Update();
						}
					}
					lastPoint = mouseXY;
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

				/*
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
					DrawLines(new Point(e.X,e.Y));
					bitmapLayer.Invalidate(simplifiedRegion);
					Workspace.History.PushNewAction(ha);

					simplifiedRegion.Dispose();
					saveMeRegion.Dispose();
				}

				tracePoints = null;
				Utility.Dispose(pen);
				pen = null;
				*/
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

        public ReindexTool(DocumentWorkspace parent)
            : base(parent,
                   Utility.GetImageResource("Icons.ReindexToolIcon.bmp"),
                   "Reindex",
                   "Change index order.",
                   "Left click swaps colormem and charmem high nybble, right click swaps charmem high and low nybble",
                   'i')
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
