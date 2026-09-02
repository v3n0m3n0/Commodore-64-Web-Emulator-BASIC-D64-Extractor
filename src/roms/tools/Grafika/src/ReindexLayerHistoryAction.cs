using System;
using System.Drawing;
using System.Windows.Forms;

namespace PaintDotNet
{
	/// <summary>
	/// Summary description for ReindexLayerHistoryAction.
	/// </summary>
	public class ReindexLayerHistoryAction
        : HistoryAction
	{
		private int index;
		private DocumentWorkspace workspace;
		private BitmapLayer bitmapLayer;
		// private RenderArgs renderArgs;
		private ColorBgra c0, c1, c2, c3, c4, c5;

		[Serializable]
			private sealed class ReindexLayerHistoryActionData
			: HistoryActionData
		{
			private Layer layer;

			public Layer Layer
			{
				get
				{
					return layer;
				}
			}

			public ReindexLayerHistoryActionData(Layer layer)
			{
				this.layer = layer;
			}

			protected override void Dispose(bool disposing)
			{
			}

		}

		protected override HistoryAction OnUndo()
        {
			workspace.Document.Layers.RemoveAt(index);
			ReindexLayerHistoryActionData data = (ReindexLayerHistoryActionData)this.Data;
			HistoryAction ha = new NewLayerHistoryAction(Name, Image, workspace, index);
			workspace.Document.Layers.Insert(index, data.Layer);

			workspace.Document.Invalidate();
			
			return ha;
        }

		private void FindTwoColors(int x2, int y2)
		{
			int x, y, colorsfound;

			colorsfound = 0;

			for(y=y2; y<bitmapLayer.Height; y+=8)
			{
				for(x=x2; x<bitmapLayer.Width/8; x++)
				{
					c1 = bitmapLayer.CharlowSurface[x,y];
					c2 = bitmapLayer.CharhighSurface[x,y];

					if(c1.A != 0 && c2.A != 0)
					{
						y = bitmapLayer.Height;
						x = bitmapLayer.Width/8;
						colorsfound = 2;
						break;
					}
				}
			}

			// start looking for another char with 2 colours, but different from the ones we found before
			if(colorsfound == 2)
			{
				for(y=0; y<bitmapLayer.Height; y+=8)
				{
					for(x=0; x<bitmapLayer.Width/8; x++)
					{
						ColorBgra args = bitmapLayer.ArgSurface[x,y];

						if((args.B & 3) == 0)
						{
							c4 = bitmapLayer.CharlowSurface[x,y];
							c5 = bitmapLayer.CharhighSurface[x,y];
						}
						else
						{
							c5 = bitmapLayer.CharlowSurface[x,y];
							c4 = bitmapLayer.CharhighSurface[x,y];
						}

						if(c4.A != 0 || c5.A != 0) // yes, 2 colours found
						{
							if(c1 != c4 && c1 != c5) // this one is a different charmemlow colour, get rid of it
							{
								c1.A = 0;
								y = bitmapLayer.Height;
								x = bitmapLayer.Width/8;
								break;
							}
							else if(c2 != c4 && c2 != c5) // this one is a different charmemhigh colour, get rid of it
							{
								c2.A = 0;
								y = bitmapLayer.Height;
								x = bitmapLayer.Width/8;
								break;
							}
						} // hmm... must be same colours... continue with loop
					}
				}
			}

			// filter out bogus colour... c1 should now contain the 'background' colour
			if(c1.A == 0) { c1 = c2; c2.A = 0; }
		}

		public ReindexLayerHistoryAction(string name, Image image, DocumentWorkspace workspace, Layer reindexMe)
            : base(name, image)
		{
			ColorBgra ctemp;
			ColorBgra color1, color2;
			int x, y, colorsfound;
			int a, b, c, temp;

			this.workspace = workspace;
			this.index = workspace.Document.Layers.IndexOf(reindexMe);
			this.Data = new ReindexLayerHistoryActionData(reindexMe);

			bitmapLayer = (BitmapLayer)workspace.Document.Layers[this.index];

			c0 = ColorBgra.FromBgra(0,0,0,0);
			c1 = ColorBgra.FromBgra(0,0,0,0);
			c2 = ColorBgra.FromBgra(0,0,0,0);
			color1 = ColorBgra.FromBgra(0,0,0,0);
			color2 = ColorBgra.FromBgra(0,0,0,0);

			if(bitmapLayer.GetRestrictMode.GetType() == typeof(RestrictModes.KoalaRestrictMode))
			{
				// found = false;

				colorsfound = 0;

				// find first char with 3 colours in it
				for(y=0; y<bitmapLayer.Height; y+=8)
				{
					for(x=0; x<bitmapLayer.Width/8; x++)
					{
						c0 = bitmapLayer.ColorSurface[x,y/8];
						c1 = bitmapLayer.CharlowSurface[x,y];
						c2 = bitmapLayer.CharhighSurface[x,y];

						if(c0.A != 0 && c1.A != 0 && c2.A != 0)
						{
							y = bitmapLayer.Height;
							x = bitmapLayer.Width/8;
							colorsfound = 3;
							break;
						}
					}
				}

				// crap, nothing found... search for 2 colours instead
				if(colorsfound == 0)
				{
					for(y=0; y<bitmapLayer.Height; y+=8)
					{
						for(x=0; x<bitmapLayer.Width/8; x++)
						{
							// find first char with 3 colours in it
							c0 = bitmapLayer.ColorSurface[x,y/8];
							c1 = bitmapLayer.CharlowSurface[x,y];
							c2 = bitmapLayer.CharhighSurface[x,y];

							if(c0.A != 0 && c1.A != 0 ||
								c0.A != 0 && c2.A != 0 ||
								c1.A != 0 && c2.A != 0)
							{
								y = bitmapLayer.Height;
								x = bitmapLayer.Width/8;
								colorsfound = 2;
								break;
							}
						}
					}
				}

				// still not found... user is stupid, or acting silly... bail out
				if(colorsfound == 0) return;

				// we should have at least 2 colours now, put transparent ones at the end
				if(colorsfound == 2)
				{
					if(c0.A == 0) { c0 = c1; c1.A = 0; } // basically a swap
					if(c1.A == 0) { c1 = c2; c2.A = 0; } // basically a swap
				}

				// found = false;

				// start looking for another char with 3 colours, but different from the ones we found before
				if(colorsfound == 3)
				{
					for(y=0; y<bitmapLayer.Height; y+=8)
					{
						for(x=0; x<bitmapLayer.Width/8; x++)
						{
							c3 = bitmapLayer.ColorSurface[x,y/8];
							c4 = bitmapLayer.CharlowSurface[x,y];
							c5 = bitmapLayer.CharhighSurface[x,y];

							if(c3.A != 0 && c4.A != 0 && c5.A != 0) // yes, 3 solid colours found
							{
								if(c0 != c3 && c0 != c4 && c0 != c5) // this one is a different colormem colour, get rid of it
								{
									c0.A = 0;
									y = bitmapLayer.Height;
									x = bitmapLayer.Width/8;
									// found = true;
									break;
								}
								else if(c1 != c3 && c1 != c4 && c1 != c5) // this one is a different colormem colour, get rid of it
								{
									c1.A = 0;
									y = bitmapLayer.Height;
									x = bitmapLayer.Width/8;
									// found = true;
									break;
								}
								else if(c2 != c3 && c2 != c4 && c2 != c5) // this one is a different colormem colour, get rid of it
								{
									c2.A = 0;
									y = bitmapLayer.Height;
									x = bitmapLayer.Width/8;
									// found = true;
									break;
								}
							}
						}
					}
				}

				// filter out bogus colours
				if(c0.A == 0) { c0 = c1; c1.A = 0; } // basically a swap
				if(c1.A == 0) { c1 = c2; c2.A = 0; } // basically a swap

				// MessageBox.Show(null, "remaining 2 colors = [" +
				//	ColorBgra.CalcRampQuickStable(c0).ToString() + "] + [" + ColorBgra.CalcRampQuickStable(c1).ToString() + "]"
				//	, "Equals", MessageBoxButtons.OK, MessageBoxIcon.Question);

				// START REINDEXING!!!
				for(y=0; y<bitmapLayer.Height; y+=8)
				{
					for(x=0; x<bitmapLayer.Width/8; x++)
					{
						ColorBgra args = bitmapLayer.ArgSurface[x,y];

						a = (args.B & 3); // ColorSurface
						b = (args.B & 12)>>2; // CharlowSurface
						c = (args.B & 48)>>4; // CharhighSurface

						c3 = bitmapLayer.ColorSurface[x,y/8];
						c4 = bitmapLayer.CharlowSurface[x,y];
						c5 = bitmapLayer.CharhighSurface[x,y];

						// SERIOUS CODE COMING UP NOW, DON'T EVEN TRY TO UNDERSTAND IT :)
						// step 1
						if((c3 != c0 && c3 != c1) || (c4 == c0) || (c3 == c1 && c4.A == 0)) { temp = a; a = b; b = temp; ctemp = c3; c3 = c4; c4 = ctemp; }
						// step 2
						if(c4 != c0 && c4 != c1) { temp = b; b = c; c = temp; ctemp = c4; c4 = c5; c5 = ctemp;}
						// step 3
						if(c3 == c1) { temp = a; a = b; b = temp; ctemp = c3; c3 = c4; c4 = ctemp; }

						// oops, wrong way around... temporary fix
						temp = a; a = c; c = temp;

						// fill transparent colours.. Bah, doesn't work because the restriction code resets it
						// if(c3.A == 0) bitmapLayer.ColorSurface[x,y/8] = c0;
						// if(c4.A == 0) bitmapLayer.CharlowSurface[x,y] = c1;

						args.B = (byte)(a + (b<<2) + (c<<4));

						bitmapLayer.ArgSurface[x,y] = args;
					}
				}
			}
			else if(bitmapLayer.GetRestrictMode.GetType() == typeof(RestrictModes.ArtStudioRestrictMode))
			{
				// find first char with 2 colours in it
				FindTwoColors(0, 0);

				//MessageBox.Show(null, "remaining color = [" + ColorBgra.CalcRampQuickStable(c1).ToString() + "]"
				//	, "Equals", MessageBoxButtons.OK, MessageBoxIcon.Question);

				// START REINDEXING!!!
				for(y=0; y<bitmapLayer.Height; y+=8)
				{
					for(x=0; x<bitmapLayer.Width/8; x++)
					{
						c4 = bitmapLayer.CharlowSurface[x,y];
						c5 = bitmapLayer.CharhighSurface[x,y];

						if(c4.A != 0 && c5.A != 0 && c4 != c1 && c5 != c1) FindTwoColors(x, y);

						a = 0;
						b = 1;
						c = 2;

						ColorBgra args = bitmapLayer.ArgSurface[x,y];

						// second colour is background colour... not correct, so swap
						if (c5 == c1 || c4 != c1) { a = 1; b = 0; }

						args.B = (byte)(a + (b<<2) + (c<<4));

						bitmapLayer.ArgSurface[x,y] = args;
					}
				}
			}
			
			bitmapLayer.Invalidate();

			MessageBox.Show(null, "Done", "Reindex", MessageBoxButtons.OK, MessageBoxIcon.Question);
		}
	}
}
