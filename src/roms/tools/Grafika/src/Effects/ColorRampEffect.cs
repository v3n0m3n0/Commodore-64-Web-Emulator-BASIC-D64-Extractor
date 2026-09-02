using System;
using System.Collections;
using System.Drawing;
using System.IO;


namespace PaintDotNet.Effects
{
	/// <summary>
	/// Summary description for ColorRampEffect.
	/// </summary>
	public class ColorRampEffect
		: Effect, IConfigurableEffect
	{
	public StreamWriter output;
	
	public override void Render(RenderArgs dstArgs, RenderArgs srcArgs, System.Drawing.Rectangle roi)
		{
			base.Render (dstArgs, srcArgs, roi);
			throw new InvalidOperationException("ColorRampEffect must be used via the other Render overload");
		}

		public ColorRampEffect()
			: base("C64 Colorramp", "Convert to colorramp.", Utility.GetImageResource("Icons.ColorrampEffect.bmp"))
		{
		}

		#region IConfigurableEffect Members

		public EffectConfigDialog CreateConfigDialog()
		{
			return new ColorRampEffectConfigDialog();
		}

		public unsafe void Render(PaintDotNet.Effects.EffectConfigToken properties, RenderArgs dstArgs, RenderArgs srcArgs, PaintDotNet.PdnRegion roi /* System.Drawing.Region roi */)
		{
			int hue = ((ColorRampEffectConfigToken)properties).Hue;
			int saturation = ((ColorRampEffectConfigToken)properties).Saturation;
			int brightness = ((ColorRampEffectConfigToken)properties).Brightness;
			int contrast = ((ColorRampEffectConfigToken)properties).Contrast;
			bool doublepixel = ((ColorRampEffectConfigToken)properties).Doublepixel;
			bool colorize = ((ColorRampEffectConfigToken)properties).Colorize;
			bool preview = ((ColorRampEffectConfigToken)properties).Preview;
			bool preserve = ((ColorRampEffectConfigToken)properties).Preserve;
			DitherMode brightnessdithermode = ((ColorRampEffectConfigToken)properties).BrightnessDithermode;
			DitherMode huedithermode = ((ColorRampEffectConfigToken)properties).HueDithermode;
			DitherMode saturationdithermode = ((ColorRampEffectConfigToken)properties).SaturationDithermode;
			int bdmi, hdmi, sdmi; // dithermode index for faster comparison

			Surface dst = dstArgs.Surface;
			Surface src = srcArgs.Surface;
			ColorBgra bccolor; // brightness contrast color
			ColorBgra hscolor; // hue saturation color
			ColorBgra rampcolor;
			int adjustleft, adjustright;

			// output = new StreamWriter(@"c:\hsb.txt");

			bdmi = brightnessdithermode.ThisIndexNumber();
			hdmi = huedithermode.ThisIndexNumber();
			sdmi = saturationdithermode.ThisIndexNumber();

			if(preview)
			{
				foreach (RectangleF rectF in roi.GetRegionScansReadOnlyInt() /*.GetRegionScans(Utility.IdentityMatrix)*/)
				{
					Rectangle rect = Rectangle.Truncate(rectF);

					adjustleft = rect.Left;
					adjustright = rect.Right;

					if(doublepixel) // Adjust rectangle so we don't get half pixels
					{
						if(rect.Left % 2 == 1) { adjustleft = rect.Left + 1; }
						if(rect.Right %2 == 1) { adjustright = rect.Right - 1; }
					}

					for (int y = rect.Top; y < rect.Bottom; ++y)
					{
						ColorBgra *dstPtr = dst.GetPointAddress(adjustleft, y);
						ColorBgra *srcPtr = src.GetPointAddress(adjustleft, y);

						if(doublepixel)
						{
							for (int x = adjustleft; x < adjustright; x += 2)
							{
								if(!preserve)
								{
									bccolor = ColorBgra.CalcBrightnessContrast(*srcPtr, (float)brightness/100.0f, (float)(contrast/100.0f) + 1.0f);
									hscolor = ColorBgra.CalcHueSaturation(bccolor, (float)hue/60.0f, (float)(saturation/100.0f), colorize);

									rampcolor = ColorBgra.CalcRamp(hscolor, x/2, y, bdmi, hdmi, sdmi, (float)saturation);
								}
								else
								{
									if(srcPtr->R == ColorBgra.c64colors[ 0].R && srcPtr->G == ColorBgra.c64colors[ 0].G && srcPtr->B == ColorBgra.c64colors[ 0].B && srcPtr->A == ColorBgra.c64colors[ 0].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[ 1].R && srcPtr->G == ColorBgra.c64colors[ 1].G && srcPtr->B == ColorBgra.c64colors[ 1].B && srcPtr->A == ColorBgra.c64colors[ 1].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[ 2].R && srcPtr->G == ColorBgra.c64colors[ 2].G && srcPtr->B == ColorBgra.c64colors[ 2].B && srcPtr->A == ColorBgra.c64colors[ 2].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[ 3].R && srcPtr->G == ColorBgra.c64colors[ 3].G && srcPtr->B == ColorBgra.c64colors[ 3].B && srcPtr->A == ColorBgra.c64colors[ 3].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[ 4].R && srcPtr->G == ColorBgra.c64colors[ 4].G && srcPtr->B == ColorBgra.c64colors[ 4].B && srcPtr->A == ColorBgra.c64colors[ 4].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[ 5].R && srcPtr->G == ColorBgra.c64colors[ 5].G && srcPtr->B == ColorBgra.c64colors[ 5].B && srcPtr->A == ColorBgra.c64colors[ 5].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[ 6].R && srcPtr->G == ColorBgra.c64colors[ 6].G && srcPtr->B == ColorBgra.c64colors[ 6].B && srcPtr->A == ColorBgra.c64colors[ 6].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[ 7].R && srcPtr->G == ColorBgra.c64colors[ 7].G && srcPtr->B == ColorBgra.c64colors[ 7].B && srcPtr->A == ColorBgra.c64colors[ 7].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[ 8].R && srcPtr->G == ColorBgra.c64colors[ 8].G && srcPtr->B == ColorBgra.c64colors[ 8].B && srcPtr->A == ColorBgra.c64colors[ 8].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[ 9].R && srcPtr->G == ColorBgra.c64colors[ 9].G && srcPtr->B == ColorBgra.c64colors[ 9].B && srcPtr->A == ColorBgra.c64colors[ 9].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[10].R && srcPtr->G == ColorBgra.c64colors[10].G && srcPtr->B == ColorBgra.c64colors[10].B && srcPtr->A == ColorBgra.c64colors[10].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[11].R && srcPtr->G == ColorBgra.c64colors[11].G && srcPtr->B == ColorBgra.c64colors[11].B && srcPtr->A == ColorBgra.c64colors[11].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[12].R && srcPtr->G == ColorBgra.c64colors[12].G && srcPtr->B == ColorBgra.c64colors[12].B && srcPtr->A == ColorBgra.c64colors[12].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[13].R && srcPtr->G == ColorBgra.c64colors[13].G && srcPtr->B == ColorBgra.c64colors[13].B && srcPtr->A == ColorBgra.c64colors[13].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[14].R && srcPtr->G == ColorBgra.c64colors[14].G && srcPtr->B == ColorBgra.c64colors[14].B && srcPtr->A == ColorBgra.c64colors[14].A) { rampcolor = *srcPtr; }
									else if(srcPtr->R == ColorBgra.c64colors[15].R && srcPtr->G == ColorBgra.c64colors[15].G && srcPtr->B == ColorBgra.c64colors[15].B && srcPtr->A == ColorBgra.c64colors[15].A) { rampcolor = *srcPtr; }
									else
									{
										bccolor = ColorBgra.CalcBrightnessContrast(*srcPtr, (float)brightness/100.0f, (float)(contrast/100.0f) + 1.0f);
										hscolor = ColorBgra.CalcHueSaturation(bccolor, (float)hue/60.0f, (float)(saturation/100.0f), colorize);

										rampcolor = ColorBgra.CalcRamp(hscolor, x/2, y, bdmi, hdmi, sdmi, (float)saturation);
									}
								}

								*dstPtr++ = rampcolor;
								*dstPtr++ = rampcolor;
								srcPtr += 2;
							}
						}
						else
						{
							for (int x = rect.Left; x < rect.Right; ++x)
							{
								if(!preserve)
								{
									bccolor = ColorBgra.CalcBrightnessContrast(*srcPtr, (float)brightness/100.0f, (float)(contrast/100.0f) + 1.0f);
									hscolor = ColorBgra.CalcHueSaturation(bccolor, (float)hue/60.0f, (float)(saturation/100.0f), colorize);

									rampcolor = ColorBgra.CalcRamp(hscolor, x, y, bdmi, hdmi, sdmi, (float)saturation);
								}
								else
								{
									if(srcPtr->R == ColorBgra.c64colors[ 0].R && srcPtr->G == ColorBgra.c64colors[ 0].G && srcPtr->B == ColorBgra.c64colors[ 0].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[ 1].R && srcPtr->G == ColorBgra.c64colors[ 1].G && srcPtr->B == ColorBgra.c64colors[ 1].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[ 2].R && srcPtr->G == ColorBgra.c64colors[ 2].G && srcPtr->B == ColorBgra.c64colors[ 2].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[ 3].R && srcPtr->G == ColorBgra.c64colors[ 3].G && srcPtr->B == ColorBgra.c64colors[ 3].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[ 4].R && srcPtr->G == ColorBgra.c64colors[ 4].G && srcPtr->B == ColorBgra.c64colors[ 4].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[ 5].R && srcPtr->G == ColorBgra.c64colors[ 5].G && srcPtr->B == ColorBgra.c64colors[ 5].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[ 6].R && srcPtr->G == ColorBgra.c64colors[ 6].G && srcPtr->B == ColorBgra.c64colors[ 6].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[ 7].R && srcPtr->G == ColorBgra.c64colors[ 7].G && srcPtr->B == ColorBgra.c64colors[ 7].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[ 8].R && srcPtr->G == ColorBgra.c64colors[ 8].G && srcPtr->B == ColorBgra.c64colors[ 8].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[ 9].R && srcPtr->G == ColorBgra.c64colors[ 9].G && srcPtr->B == ColorBgra.c64colors[ 9].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[10].R && srcPtr->G == ColorBgra.c64colors[10].G && srcPtr->B == ColorBgra.c64colors[10].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[11].R && srcPtr->G == ColorBgra.c64colors[11].G && srcPtr->B == ColorBgra.c64colors[11].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[12].R && srcPtr->G == ColorBgra.c64colors[12].G && srcPtr->B == ColorBgra.c64colors[12].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[13].R && srcPtr->G == ColorBgra.c64colors[13].G && srcPtr->B == ColorBgra.c64colors[13].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[14].R && srcPtr->G == ColorBgra.c64colors[14].G && srcPtr->B == ColorBgra.c64colors[14].B) rampcolor = *srcPtr;
									else if(srcPtr->R == ColorBgra.c64colors[15].R && srcPtr->G == ColorBgra.c64colors[15].G && srcPtr->B == ColorBgra.c64colors[15].B) rampcolor = *srcPtr;
									else
									{
										bccolor = ColorBgra.CalcBrightnessContrast(*srcPtr, (float)brightness/100.0f, (float)(contrast/100.0f) + 1.0f);
										hscolor = ColorBgra.CalcHueSaturation(bccolor, (float)hue/60.0f, (float)(saturation/100.0f), colorize);

										rampcolor = ColorBgra.CalcRamp(hscolor, x, y, bdmi, hdmi, sdmi, (float)saturation);
									}
								}

								*dstPtr++ = rampcolor;
								srcPtr++;
							}
						}
					}
				}
			}
			else
			{
				foreach (RectangleF rectF in roi.GetRegionScansReadOnlyInt() /*.GetRegionScans(Utility.IdentityMatrix)*/)
				{
					Rectangle rect = Rectangle.Truncate(rectF);

					adjustleft = rect.Left;
					adjustright = rect.Right;

					for (int y = rect.Top; y < rect.Bottom; ++y)
					{
						ColorBgra *dstPtr = dst.GetPointAddress(adjustleft, y);
						ColorBgra *srcPtr = src.GetPointAddress(adjustleft, y);

						for (int x = rect.Left; x < rect.Right; ++x)
						{
							*dstPtr++ = *srcPtr;
							srcPtr++;
						}
					}
				}
			}
			// output.Close();
		}

		#endregion
	}
}
