using System;
using System.Collections;
using System.ComponentModel;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Reflection;
using System.Runtime.InteropServices;

namespace PaintDotNet
{
    /// <summary>
    /// This is our pixel format that we will work with. It is always 32-bits / 4-bytes and is
    /// always laid out in BGRA order.
    /// Generally used with the Surface class.
    /// </summary>
    [StructLayout(LayoutKind.Explicit)]
    public struct ColorBgra
    {
        [FieldOffset(0)] public byte B;
        [FieldOffset(1)] public byte G;
        [FieldOffset(2)] public byte R;
        [FieldOffset(3)] public byte A;

		/// <summary>
		/// Lets you change B, G, R, and A at the same time.
		/// </summary>
		[FieldOffset(0)] 
        [CLSCompliant(false)]
        public uint Bgra;

        public const int BlueChannel = 0;
        public const int GreenChannel = 1;
        public const int RedChannel = 2;
        public const int AlphaChannel = 3;

        public const int SizeOf = 4;

        /// <summary>
        /// Gets or sets the byte value of the specified color channel.
        /// </summary>
        public unsafe byte this[int channel]
        {
            get
            {
                if (channel < 0 || channel > 3)
                {
                    throw new ArgumentOutOfRangeException("channel", channel, "valid range is [0,3]");
                }

                fixed (byte *p = &B)
                {
                    return p[channel];
                }
            }

            set
            {
                if (channel < 0 || channel > 3)
                {
                    throw new ArgumentOutOfRangeException("channel", channel, "valid range is [0,3]");
                }

                fixed (byte *p = &B)
                {
                    p[channel] = value;
                }
            }
        }

        /// <summary>
        /// Gets the luminance intensity of the pixel based on the values of the red, green, and blue components. Alpha is ignored.
        /// </summary>
        /// <returns>A value in the range 0 to 1 inclusive.</returns>
        public double GetIntensity()
        {
            return ((0.114 * (double)B) + (0.587 * (double)G) + (0.299 * (double)R)) / 255.0;
        }

        /// <summary>
        /// Gets the luminance intensity of the pixel based on the values of the red, green, and blue components. Alpha is ignored.
        /// </summary>
        /// <returns>A value in the range 0 to 255 inclusive.</returns>
        public byte GetIntensityByte()
        {
            return (byte)((0.114 * (double)B) + (0.587 * (double)G) + (0.299 * (double)R));
        }

        /// <summary>
        /// Compares two ColorBgra instance to determine if they are equal.
        /// </summary>
        public static bool operator == (ColorBgra lhs, ColorBgra rhs)
		{
			return lhs.Bgra == rhs.Bgra;
		}

        /// <summary>
        /// Compares two ColorBgra instance to determine if they are not equal.
        /// </summary>
        public static bool operator != (ColorBgra lhs, ColorBgra rhs)
		{
			return lhs.Bgra != rhs.Bgra;
		}

        /// <summary>
        /// Compares two ColorBgra instance to determine if they are equal.
        /// </summary>
        public override bool Equals(object obj)
		{
            
            if (obj != null && obj is ColorBgra && ((ColorBgra)obj).Bgra == this.Bgra)
            {
                return true;
            }
            else
            {
                return false;
            }
		}

        /// <summary>
        /// Returns a hash code for this color value.
        /// </summary>
        /// <returns></returns>
    	public override int GetHashCode()
		{
            unchecked
            {
                return (int)Bgra;
            }
		}

        /// <summary>
        /// Gets the equivalent GDI+ PixelFormat.
        /// </summary>
        /// <remarks>
        /// This property always returns PixelFormat.Format32bppArgb.
        /// </remarks>
        public static PixelFormat PixelFormat
        {
            get
            {
                return PixelFormat.Format32bppArgb;
            }
        }

        /// <summary>
        /// Returns a new ColorBgra with the same color values but with a new alpha component value.
        /// </summary>
        public ColorBgra NewAlpha(byte newA)
        {
            return ColorBgra.FromBgra(B, G, R, newA);
        }

        /// <summary>
        /// Creates a new ColorBgra instance with the given color and alpha values.
        /// </summary>
        public static ColorBgra FromRgba(byte r, byte g, byte b, byte a)
        {
            ColorBgra color = new ColorBgra();

            color.R = r;
            color.G = g;
            color.B = b;
            color.A = a;

            return color;
        }

        /// <summary>
        /// Creates a new ColorBgra instance with the given color values, and 255 for alpha.
        /// </summary>
        public static ColorBgra FromRgb(byte r, byte g, byte b)
        {
            return FromRgba(r, g, b, 255);
        }

        /// <summary>
        /// Creates a new ColorBgra instance with the given color and alpha values.
        /// </summary>
        public static ColorBgra FromBgra(byte b, byte g, byte r, byte a)
        {
            ColorBgra color = new ColorBgra();

            color.B = b;
            color.G = g;
            color.R = r;
            color.A = a;

            return color;        
        }

        /// <summary>
        /// Creates a new ColorBgra instance with the given color values, and 255 for alpha.
        /// </summary>
        public static ColorBgra FromBgr(byte b, byte g, byte r)
        {
            return FromRgb(r, g, b);
        }

        /// <summary>
        /// Constructs a new ColorBgra instance with the given 32-bit value.
        /// </summary>
        [CLSCompliant(false)]
        public static ColorBgra FromUInt32(UInt32 bgra)
        {
            ColorBgra color = new ColorBgra();
            color.Bgra = bgra;
            return color;
        }

        /// <summary>
        /// Constructs a new ColorBgra instance from the values in the given Color instance.
        /// </summary>
        public static ColorBgra FromColor(Color c)
        {
            return FromRgba(c.R, c.G, c.B, c.A);
        }

        /// <summary>
        /// Converts this ColorBgra instance to a Color instance.
        /// </summary>
        public Color ToColor()
        {
            return Color.FromArgb(A, R, G, B);
        }

        /// <summary>
        /// Linearly interpolates between two color values.
        /// </summary>
        /// <param name="from">The color value that represents 0 on the lerp number line.</param>
        /// <param name="to">The color value that represents 1 on the lerp number line.</param>
        /// <param name="frac">A value in the range [0, 1].</param>
		public static ColorBgra Lerp(ColorBgra from, ColorBgra to, float frac) 
		{
			ColorBgra ret = new ColorBgra();

			ret.B = (byte)Utility.ClampToByte(Utility.Lerp(from.B, to.B, frac));
			ret.G = (byte)Utility.ClampToByte(Utility.Lerp(from.G, to.G, frac));
			ret.R = (byte)Utility.ClampToByte(Utility.Lerp(from.R, to.R, frac));
			ret.A = (byte)Utility.ClampToByte(Utility.Lerp(from.A, to.A, frac));

			return ret;
		}

        /// <summary>
        /// Linearly interpolates between two color values.
        /// </summary>
        /// <param name="from">The color value that represents 0 on the lerp number line.</param>
        /// <param name="to">The color value that represents 1 on the lerp number line.</param>
        /// <param name="frac">A value in the range [0, 1].</param>
        public static ColorBgra Lerp(ColorBgra from, ColorBgra to, double frac) 
        {
            ColorBgra ret = new ColorBgra();

            ret.B = (byte)Utility.ClampToByte(Utility.Lerp(from.B, to.B, frac));
            ret.G = (byte)Utility.ClampToByte(Utility.Lerp(from.G, to.G, frac));
            ret.R = (byte)Utility.ClampToByte(Utility.Lerp(from.R, to.R, frac));
            ret.A = (byte)Utility.ClampToByte(Utility.Lerp(from.A, to.A, frac));

            return ret;
		}

		public override string ToString()
		{
			return "B: " + B + ", G: " + G + ", R: " + R + ", A: " + A;
		}

        /// <summary>
        /// Casts a ColorBgra to a UInt32.
        /// </summary>
        [CLSCompliant(false)]
        public static explicit operator UInt32(ColorBgra color)
        {
            return color.Bgra;
        }

        /// <summary>
        /// Casts a UInt32 to a ColorBgra.
        /// </summary>
        [CLSCompliant(false)]
        public static explicit operator ColorBgra(UInt32 uint32)
        {
            return ColorBgra.FromUInt32(uint32);
        }

        // Colors: copied from System.Drawing.Color's list (don't worry I didn't type it in 
        // manually, I used a code generation w/ reflection ...)
        public static ColorBgra Transparent
        {
            get
            {
                return ColorBgra.FromBgra(255, 255, 255, 0);
            }
        }

        public static ColorBgra AliceBlue
        {
            get
            {
                return ColorBgra.FromBgra(255, 248, 240, 255);
            }
        }

        public static ColorBgra AntiqueWhite
        {
            get
            {
                return ColorBgra.FromBgra(215, 235, 250, 255);
            }
        }

        public static ColorBgra Aqua
        {
            get
            {
                return ColorBgra.FromBgra(255, 255, 0, 255);
            }
        }

        public static ColorBgra Aquamarine
        {
            get
            {
                return ColorBgra.FromBgra(212, 255, 127, 255);
            }
        }

        public static ColorBgra Azure
        {
            get
            {
                return ColorBgra.FromBgra(255, 255, 240, 255);
            }
        }

        public static ColorBgra Beige
        {
            get
            {
                return ColorBgra.FromBgra(220, 245, 245, 255);
            }
        }

        public static ColorBgra Bisque
        {
            get
            {
                return ColorBgra.FromBgra(196, 228, 255, 255);
            }
        }

        public static ColorBgra Black
        {
            get
            {
                return ColorBgra.FromBgra(0, 0, 0, 255);
            }
        }

        public static ColorBgra BlanchedAlmond
        {
            get
            {
                return ColorBgra.FromBgra(205, 235, 255, 255);
            }
        }

        public static ColorBgra Blue
        {
            get
            {
                return ColorBgra.FromBgra(255, 0, 0, 255);
            }
        }

        public static ColorBgra BlueViolet
        {
            get
            {
                return ColorBgra.FromBgra(226, 43, 138, 255);
            }
        }

        public static ColorBgra Brown
        {
            get
            {
                return ColorBgra.FromBgra(42, 42, 165, 255);
            }
        }

        public static ColorBgra BurlyWood
        {
            get
            {
                return ColorBgra.FromBgra(135, 184, 222, 255);
            }
        }

        public static ColorBgra CadetBlue
        {
            get
            {
                return ColorBgra.FromBgra(160, 158, 95, 255);
            }
        }

        public static ColorBgra Chartreuse
        {
            get
            {
                return ColorBgra.FromBgra(0, 255, 127, 255);
            }
        }

        public static ColorBgra Chocolate
        {
            get
            {
                return ColorBgra.FromBgra(30, 105, 210, 255);
            }
        }

        public static ColorBgra Coral
        {
            get
            {
                return ColorBgra.FromBgra(80, 127, 255, 255);
            }
        }

        public static ColorBgra CornflowerBlue
        {
            get
            {
                return ColorBgra.FromBgra(237, 149, 100, 255);
            }
        }

        public static ColorBgra Cornsilk
        {
            get
            {
                return ColorBgra.FromBgra(220, 248, 255, 255);
            }
        }

        public static ColorBgra Crimson
        {
            get
            {
                return ColorBgra.FromBgra(60, 20, 220, 255);
            }
        }

        public static ColorBgra Cyan
        {
            get
            {
                return ColorBgra.FromBgra(255, 255, 0, 255);
            }
        }

        public static ColorBgra DarkBlue
        {
            get
            {
                return ColorBgra.FromBgra(139, 0, 0, 255);
            }
        }

        public static ColorBgra DarkCyan
        {
            get
            {
                return ColorBgra.FromBgra(139, 139, 0, 255);
            }
        }

        public static ColorBgra DarkGoldenrod
        {
            get
            {
                return ColorBgra.FromBgra(11, 134, 184, 255);
            }
        }

        public static ColorBgra DarkGray
        {
            get
            {
                return ColorBgra.FromBgra(169, 169, 169, 255);
            }
        }

        public static ColorBgra DarkGreen
        {
            get
            {
                return ColorBgra.FromBgra(0, 100, 0, 255);
            }
        }

        public static ColorBgra DarkKhaki
        {
            get
            {
                return ColorBgra.FromBgra(107, 183, 189, 255);
            }
        }

        public static ColorBgra DarkMagenta
        {
            get
            {
                return ColorBgra.FromBgra(139, 0, 139, 255);
            }
        }

        public static ColorBgra DarkOliveGreen
        {
            get
            {
                return ColorBgra.FromBgra(47, 107, 85, 255);
            }
        }

        public static ColorBgra DarkOrange
        {
            get
            {
                return ColorBgra.FromBgra(0, 140, 255, 255);
            }
        }

        public static ColorBgra DarkOrchid
        {
            get
            {
                return ColorBgra.FromBgra(204, 50, 153, 255);
            }
        }

        public static ColorBgra DarkRed
        {
            get
            {
                return ColorBgra.FromBgra(0, 0, 139, 255);
            }
        }

        public static ColorBgra DarkSalmon
        {
            get
            {
                return ColorBgra.FromBgra(122, 150, 233, 255);
            }
        }

        public static ColorBgra DarkSeaGreen
        {
            get
            {
                return ColorBgra.FromBgra(139, 188, 143, 255);
            }
        }

        public static ColorBgra DarkSlateBlue
        {
            get
            {
                return ColorBgra.FromBgra(139, 61, 72, 255);
            }
        }

        public static ColorBgra DarkSlateGray
        {
            get
            {
                return ColorBgra.FromBgra(79, 79, 47, 255);
            }
        }

        public static ColorBgra DarkTurquoise
        {
            get
            {
                return ColorBgra.FromBgra(209, 206, 0, 255);
            }
        }

        public static ColorBgra DarkViolet
        {
            get
            {
                return ColorBgra.FromBgra(211, 0, 148, 255);
            }
        }

        public static ColorBgra DeepPink
        {
            get
            {
                return ColorBgra.FromBgra(147, 20, 255, 255);
            }
        }

        public static ColorBgra DeepSkyBlue
        {
            get
            {
                return ColorBgra.FromBgra(255, 191, 0, 255);
            }
        }

        public static ColorBgra DimGray
        {
            get
            {
                return ColorBgra.FromBgra(105, 105, 105, 255);
            }
        }

        public static ColorBgra DodgerBlue
        {
            get
            {
                return ColorBgra.FromBgra(255, 144, 30, 255);
            }
        }

        public static ColorBgra Firebrick
        {
            get
            {
                return ColorBgra.FromBgra(34, 34, 178, 255);
            }
        }

        public static ColorBgra FloralWhite
        {
            get
            {
                return ColorBgra.FromBgra(240, 250, 255, 255);
            }
        }

        public static ColorBgra ForestGreen
        {
            get
            {
                return ColorBgra.FromBgra(34, 139, 34, 255);
            }
        }

        public static ColorBgra Fuchsia
        {
            get
            {
                return ColorBgra.FromBgra(255, 0, 255, 255);
            }
        }

        public static ColorBgra Gainsboro
        {
            get
            {
                return ColorBgra.FromBgra(220, 220, 220, 255);
            }
        }

        public static ColorBgra GhostWhite
        {
            get
            {
                return ColorBgra.FromBgra(255, 248, 248, 255);
            }
        }

        public static ColorBgra Gold
        {
            get
            {
                return ColorBgra.FromBgra(0, 215, 255, 255);
            }
        }

        public static ColorBgra Goldenrod
        {
            get
            {
                return ColorBgra.FromBgra(32, 165, 218, 255);
            }
        }

        public static ColorBgra Gray
        {
            get
            {
                return ColorBgra.FromBgra(128, 128, 128, 255);
            }
        }

        public static ColorBgra Green
        {
            get
            {
                return ColorBgra.FromBgra(0, 128, 0, 255);
            }
        }

        public static ColorBgra GreenYellow
        {
            get
            {
                return ColorBgra.FromBgra(47, 255, 173, 255);
            }
        }

        public static ColorBgra Honeydew
        {
            get
            {
                return ColorBgra.FromBgra(240, 255, 240, 255);
            }
        }

        public static ColorBgra HotPink
        {
            get
            {
                return ColorBgra.FromBgra(180, 105, 255, 255);
            }
        }

        public static ColorBgra IndianRed
        {
            get
            {
                return ColorBgra.FromBgra(92, 92, 205, 255);
            }
        }

        public static ColorBgra Indigo
        {
            get
            {
                return ColorBgra.FromBgra(130, 0, 75, 255);
            }
        }

        public static ColorBgra Ivory
        {
            get
            {
                return ColorBgra.FromBgra(240, 255, 255, 255);
            }
        }

        public static ColorBgra Khaki
        {
            get
            {
                return ColorBgra.FromBgra(140, 230, 240, 255);
            }
        }

        public static ColorBgra Lavender
        {
            get
            {
                return ColorBgra.FromBgra(250, 230, 230, 255);
            }
        }

        public static ColorBgra LavenderBlush
        {
            get
            {
                return ColorBgra.FromBgra(245, 240, 255, 255);
            }
        }

        public static ColorBgra LawnGreen
        {
            get
            {
                return ColorBgra.FromBgra(0, 252, 124, 255);
            }
        }

        public static ColorBgra LemonChiffon
        {
            get
            {
                return ColorBgra.FromBgra(205, 250, 255, 255);
            }
        }

        public static ColorBgra LightBlue
        {
            get
            {
                return ColorBgra.FromBgra(230, 216, 173, 255);
            }
        }

        public static ColorBgra LightCoral
        {
            get
            {
                return ColorBgra.FromBgra(128, 128, 240, 255);
            }
        }

        public static ColorBgra LightCyan
        {
            get
            {
                return ColorBgra.FromBgra(255, 255, 224, 255);
            }
        }

        public static ColorBgra LightGoldenrodYellow
        {
            get
            {
                return ColorBgra.FromBgra(210, 250, 250, 255);
            }
        }

        public static ColorBgra LightGreen
        {
            get
            {
                return ColorBgra.FromBgra(144, 238, 144, 255);
            }
        }

        public static ColorBgra LightGray
        {
            get
            {
                return ColorBgra.FromBgra(211, 211, 211, 255);
            }
        }

        public static ColorBgra LightPink
        {
            get
            {
                return ColorBgra.FromBgra(193, 182, 255, 255);
            }
        }

        public static ColorBgra LightSalmon
        {
            get
            {
                return ColorBgra.FromBgra(122, 160, 255, 255);
            }
        }

        public static ColorBgra LightSeaGreen
        {
            get
            {
                return ColorBgra.FromBgra(170, 178, 32, 255);
            }
        }

        public static ColorBgra LightSkyBlue
        {
            get
            {
                return ColorBgra.FromBgra(250, 206, 135, 255);
            }
        }

        public static ColorBgra LightSlateGray
        {
            get
            {
                return ColorBgra.FromBgra(153, 136, 119, 255);
            }
        }

        public static ColorBgra LightSteelBlue
        {
            get
            {
                return ColorBgra.FromBgra(222, 196, 176, 255);
            }
        }

        public static ColorBgra LightYellow
        {
            get
            {
                return ColorBgra.FromBgra(224, 255, 255, 255);
            }
        }

        public static ColorBgra Lime
        {
            get
            {
                return ColorBgra.FromBgra(0, 255, 0, 255);
            }
        }

        public static ColorBgra LimeGreen
        {
            get
            {
                return ColorBgra.FromBgra(50, 205, 50, 255);
            }
        }

        public static ColorBgra Linen
        {
            get
            {
                return ColorBgra.FromBgra(230, 240, 250, 255);
            }
        }

        public static ColorBgra Magenta
        {
            get
            {
                return ColorBgra.FromBgra(255, 0, 255, 255);
            }
        }

        public static ColorBgra Maroon
        {
            get
            {
                return ColorBgra.FromBgra(0, 0, 128, 255);
            }
        }

        public static ColorBgra MediumAquamarine
        {
            get
            {
                return ColorBgra.FromBgra(170, 205, 102, 255);
            }
        }

        public static ColorBgra MediumBlue
        {
            get
            {
                return ColorBgra.FromBgra(205, 0, 0, 255);
            }
        }

        public static ColorBgra MediumOrchid
        {
            get
            {
                return ColorBgra.FromBgra(211, 85, 186, 255);
            }
        }

        public static ColorBgra MediumPurple
        {
            get
            {
                return ColorBgra.FromBgra(219, 112, 147, 255);
            }
        }

        public static ColorBgra MediumSeaGreen
        {
            get
            {
                return ColorBgra.FromBgra(113, 179, 60, 255);
            }
        }

        public static ColorBgra MediumSlateBlue
        {
            get
            {
                return ColorBgra.FromBgra(238, 104, 123, 255);
            }
        }

        public static ColorBgra MediumSpringGreen
        {
            get
            {
                return ColorBgra.FromBgra(154, 250, 0, 255);
            }
        }

        public static ColorBgra MediumTurquoise
        {
            get
            {
                return ColorBgra.FromBgra(204, 209, 72, 255);
            }
        }

        public static ColorBgra MediumVioletRed
        {
            get
            {
                return ColorBgra.FromBgra(133, 21, 199, 255);
            }
        }

        public static ColorBgra MidnightBlue
        {
            get
            {
                return ColorBgra.FromBgra(112, 25, 25, 255);
            }
        }

        public static ColorBgra MintCream
        {
            get
            {
                return ColorBgra.FromBgra(250, 255, 245, 255);
            }
        }

        public static ColorBgra MistyRose
        {
            get
            {
                return ColorBgra.FromBgra(225, 228, 255, 255);
            }
        }

        public static ColorBgra Moccasin
        {
            get
            {
                return ColorBgra.FromBgra(181, 228, 255, 255);
            }
        }

        public static ColorBgra NavajoWhite
        {
            get
            {
                return ColorBgra.FromBgra(173, 222, 255, 255);
            }
        }

        public static ColorBgra Navy
        {
            get
            {
                return ColorBgra.FromBgra(128, 0, 0, 255);
            }
        }

        public static ColorBgra OldLace
        {
            get
            {
                return ColorBgra.FromBgra(230, 245, 253, 255);
            }
        }

        public static ColorBgra Olive
        {
            get
            {
                return ColorBgra.FromBgra(0, 128, 128, 255);
            }
        }

        public static ColorBgra OliveDrab
        {
            get
            {
                return ColorBgra.FromBgra(35, 142, 107, 255);
            }
        }

        public static ColorBgra Orange
        {
            get
            {
                return ColorBgra.FromBgra(0, 165, 255, 255);
            }
        }

        public static ColorBgra OrangeRed
        {
            get
            {
                return ColorBgra.FromBgra(0, 69, 255, 255);
            }
        }

        public static ColorBgra Orchid
        {
            get
            {
                return ColorBgra.FromBgra(214, 112, 218, 255);
            }
        }

        public static ColorBgra PaleGoldenrod
        {
            get
            {
                return ColorBgra.FromBgra(170, 232, 238, 255);
            }
        }

        public static ColorBgra PaleGreen
        {
            get
            {
                return ColorBgra.FromBgra(152, 251, 152, 255);
            }
        }

        public static ColorBgra PaleTurquoise
        {
            get
            {
                return ColorBgra.FromBgra(238, 238, 175, 255);
            }
        }

        public static ColorBgra PaleVioletRed
        {
            get
            {
                return ColorBgra.FromBgra(147, 112, 219, 255);
            }
        }

        public static ColorBgra PapayaWhip
        {
            get
            {
                return ColorBgra.FromBgra(213, 239, 255, 255);
            }
        }

        public static ColorBgra PeachPuff
        {
            get
            {
                return ColorBgra.FromBgra(185, 218, 255, 255);
            }
        }

        public static ColorBgra Peru
        {
            get
            {
                return ColorBgra.FromBgra(63, 133, 205, 255);
            }
        }

        public static ColorBgra Pink
        {
            get
            {
                return ColorBgra.FromBgra(203, 192, 255, 255);
            }
        }

        public static ColorBgra Plum
        {
            get
            {
                return ColorBgra.FromBgra(221, 160, 221, 255);
            }
        }

        public static ColorBgra PowderBlue
        {
            get
            {
                return ColorBgra.FromBgra(230, 224, 176, 255);
            }
        }

        public static ColorBgra Purple
        {
            get
            {
                return ColorBgra.FromBgra(128, 0, 128, 255);
            }
        }

        public static ColorBgra Red
        {
            get
            {
                return ColorBgra.FromBgra(0, 0, 255, 255);
            }
        }

        public static ColorBgra RosyBrown
        {
            get
            {
                return ColorBgra.FromBgra(143, 143, 188, 255);
            }
        }

        public static ColorBgra RoyalBlue
        {
            get
            {
                return ColorBgra.FromBgra(225, 105, 65, 255);
            }
        }

        public static ColorBgra SaddleBrown
        {
            get
            {
                return ColorBgra.FromBgra(19, 69, 139, 255);
            }
        }

        public static ColorBgra Salmon
        {
            get
            {
                return ColorBgra.FromBgra(114, 128, 250, 255);
            }
        }

        public static ColorBgra SandyBrown
        {
            get
            {
                return ColorBgra.FromBgra(96, 164, 244, 255);
            }
        }

        public static ColorBgra SeaGreen
        {
            get
            {
                return ColorBgra.FromBgra(87, 139, 46, 255);
            }
        }

        public static ColorBgra SeaShell
        {
            get
            {
                return ColorBgra.FromBgra(238, 245, 255, 255);
            }
        }

        public static ColorBgra Sienna
        {
            get
            {
                return ColorBgra.FromBgra(45, 82, 160, 255);
            }
        }

        public static ColorBgra Silver
        {
            get
            {
                return ColorBgra.FromBgra(192, 192, 192, 255);
            }
        }

        public static ColorBgra SkyBlue
        {
            get
            {
                return ColorBgra.FromBgra(235, 206, 135, 255);
            }
        }

        public static ColorBgra SlateBlue
        {
            get
            {
                return ColorBgra.FromBgra(205, 90, 106, 255);
            }
        }

        public static ColorBgra SlateGray
        {
            get
            {
                return ColorBgra.FromBgra(144, 128, 112, 255);
            }
        }

        public static ColorBgra Snow
        {
            get
            {
                return ColorBgra.FromBgra(250, 250, 255, 255);
            }
        }

        public static ColorBgra SpringGreen
        {
            get
            {
                return ColorBgra.FromBgra(127, 255, 0, 255);
            }
        }

        public static ColorBgra SteelBlue
        {
            get
            {
                return ColorBgra.FromBgra(180, 130, 70, 255);
            }
        }

        public static ColorBgra Tan
        {
            get
            {
                return ColorBgra.FromBgra(140, 180, 210, 255);
            }
        }

        public static ColorBgra Teal
        {
            get
            {
                return ColorBgra.FromBgra(128, 128, 0, 255);
            }
        }

        public static ColorBgra Thistle
        {
            get
            {
                return ColorBgra.FromBgra(216, 191, 216, 255);
            }
        }

        public static ColorBgra Tomato
        {
            get
            {
                return ColorBgra.FromBgra(71, 99, 255, 255);
            }
        }

        public static ColorBgra Turquoise
        {
            get
            {
                return ColorBgra.FromBgra(208, 224, 64, 255);
            }
        }

        public static ColorBgra Violet
        {
            get
            {
                return ColorBgra.FromBgra(238, 130, 238, 255);
            }
        }

        public static ColorBgra Wheat
        {
            get
            {
                return ColorBgra.FromBgra(179, 222, 245, 255);
            }
        }

        public static ColorBgra White
        {
            get
            {
                return ColorBgra.FromBgra(255, 255, 255, 255);
            }
        }

        public static ColorBgra WhiteSmoke
        {
            get
            {
                return ColorBgra.FromBgra(245, 245, 245, 255);
            }
        }

        public static ColorBgra Yellow
        {
            get
            {
                return ColorBgra.FromBgra(0, 255, 255, 255);
            }
        }

        public static ColorBgra YellowGreen
        {
            get
            {
                return ColorBgra.FromBgra(50, 205, 154, 255);
            }
        }

        public static ColorBgra Zero
        {
            get
            {
                return (ColorBgra)0;
            }
        }

        private static Hashtable predefinedColors;

        /// <summary>
        /// Gets a hashtable that contains a list of all the predefined colors.
        /// These are the same color values that are defined as public static properties
        /// in System.Drawing.Color. The hashtable uses strings for the keys, and
        /// ColorBgras for the values.
        /// </summary>
        public static Hashtable PredefinedColors
        {
            get
            {
                if (predefinedColors != null)
                {
                    Type colorBgraType = typeof(ColorBgra);
                    PropertyInfo[] propInfos = colorBgraType.GetProperties(BindingFlags.Static | BindingFlags.Public);
                    Hashtable colors = new Hashtable();
                    
                    foreach (PropertyInfo pi in propInfos)
                    {
                        if (pi.PropertyType == colorBgraType)
                        {
                            colors.Add(pi.Name, pi.GetValue(null, null));
                        }
                    }
                }

                return (Hashtable)predefinedColors.Clone();
            }
        }

		/*
		// Lars' palette
		public static ColorBgra[] c64colors =
		{
			ColorBgra.FromBgra(  0,   0,   0, 255), // zwart
			ColorBgra.FromBgra(255, 255, 255, 255), // wit
			ColorBgra.FromBgra( 18,  41, 140, 255), // rood
			ColorBgra.FromBgra(199, 190, 121, 255), // cyaan
			ColorBgra.FromBgra(174,  70, 132, 255), // paars
			ColorBgra.FromBgra( 55, 179,  84, 255), // groen
			ColorBgra.FromBgra(162,  48,  48, 255), // blauw
			ColorBgra.FromBgra(112, 219, 210, 255), // geel
			
			ColorBgra.FromBgra( 31,  87, 163, 255), // oranje // HACK, 95 was 87
			ColorBgra.FromBgra(  0,  39,  80, 255), // bruin
			ColorBgra.FromBgra(108, 114, 187, 255), // roze
			ColorBgra.FromBgra( 80,  80,  80, 255), // donkergrijs
			ColorBgra.FromBgra(128, 128, 128, 255), // middelgrijs
			ColorBgra.FromBgra(127, 243, 154, 255), // lichtgroen
			ColorBgra.FromBgra(218, 111, 111, 255), // lichtblauw
			ColorBgra.FromBgra(171, 171, 171, 255), // lichtgrijs
			ColorBgra.FromBgra(  0,   0,   0,   0)
		};
		*/

		// Vice geinterpoleerd palette
		public static ColorBgra[] c64colors =
		{
			ColorBgra.FromBgra(0,0,0, 255), // zwart
			ColorBgra.FromBgra(213,213,213, 255), // wit
			ColorBgra.FromBgra(44,53,114, 255), // rood
			ColorBgra.FromBgra(166,159,101, 255), // cyaan
			ColorBgra.FromBgra(145,58,115, 255), // paars
			ColorBgra.FromBgra(53,141,86, 255), // groen
			ColorBgra.FromBgra(125,35,46, 255), // blauw
			ColorBgra.FromBgra(94,183,174, 255), // geel
			
			ColorBgra.FromBgra(30,79,119, 255), // oranje // HACK, 95 was 87
			ColorBgra.FromBgra(0,60,75, 255), // bruin
			ColorBgra.FromBgra(90,99,156, 255), // roze
			ColorBgra.FromBgra(71,71,71, 255), // donkergrijs
			ColorBgra.FromBgra(107,107,107, 255), // middelgrijs
			ColorBgra.FromBgra(113,194,143, 255), // lichtgroen
			ColorBgra.FromBgra(182,93,103, 255), // lichtblauw
			ColorBgra.FromBgra(143,143,143, 255), // lichtgrijs
			ColorBgra.FromBgra(  0,   0,   0,   0)
		};

		/*
		// Ben's palette
		public static ColorBgra[] c64colors =
		{
			ColorBgra.FromBgra(  0,   0,   0, 255), // zwart
			ColorBgra.FromBgra(255, 255, 255, 255), // wit
			ColorBgra.FromBgra( 70,  75, 111, 255), // rood
			ColorBgra.FromBgra(185, 181, 147, 255), // cyaan
			ColorBgra.FromBgra(140,  87, 121, 255), // paars
			ColorBgra.FromBgra(102, 154, 121, 255), // groen
			ColorBgra.FromBgra(116,  58,  64, 255), // blauw
			ColorBgra.FromBgra(160, 212, 206, 255), // geel

			ColorBgra.FromBgra( 71,  99, 124, 255), // oranje
			ColorBgra.FromBgra( 18,  69,  80, 255), // bruin
			ColorBgra.FromBgra(124, 129, 163, 255), // roze
			ColorBgra.FromBgra( 85,  85,  85, 255), // donkergrijs
			ColorBgra.FromBgra(128, 128, 128, 255), // middelgrijs
			ColorBgra.FromBgra(171, 219, 188, 255), // lichtgroen
			ColorBgra.FromBgra(174, 120, 126, 255), // lichtblauw
			ColorBgra.FromBgra(171, 171, 171, 255), // lichtgrijs
			ColorBgra.FromBgra(  0,   0,   0,   0)
		};
		*/

		/*	colour					s			lindex (v)	hindex (>)
			----------------------------------------------------------
																		// 00 zwart			         0,			 1,			 5
																		// 01 wit			         0,			16,			 5
			02 rood				 0.7721519,			 5,			 6
			03 cyaan			 0.4105263,			10,			20
			04 paars			 0.4262295,			 8,			28
			05 groen			 0.5364807,			 7,			13
			06 blauw			 0.5502393,			 7,			25
			07 geel				       0.6,			10,			10
			08 oranje			 0.6804124,			 6,			 7
			09 bruin			         1,			 3,			 7
			0A roze				 0.3703704,			 9,			 5
																		// 0B dgrijs		         0,			 5,			 5
																		// 0C mgrijs		         0,			 8,			 5
			0D lgroen			 0.8285714,			11,			13
			0E lblauw			 0.5934066,			10,			25
																		// 0F lgrijs		         0,			11,			 5
		*/

		public static int GetIndexedC64Color(ColorBgra color)
		{
			//     if(color.R == ColorBgra.c64colors[16].R && color.G == ColorBgra.c64colors[16].G && color.B == ColorBgra.c64colors[16].B && color.A == ColorBgra.c64colors[16].A) { return 16; }
			     if(color.A < 255) { return 16; }
			else if(color.R == ColorBgra.c64colors[ 0].R && color.G == ColorBgra.c64colors[ 0].G && color.B == ColorBgra.c64colors[ 0].B) { return 0; }
			else if(color.R == ColorBgra.c64colors[ 1].R && color.G == ColorBgra.c64colors[ 1].G && color.B == ColorBgra.c64colors[ 1].B) { return 1; }
			else if(color.R == ColorBgra.c64colors[ 2].R && color.G == ColorBgra.c64colors[ 2].G && color.B == ColorBgra.c64colors[ 2].B) { return 2; }
			else if(color.R == ColorBgra.c64colors[ 3].R && color.G == ColorBgra.c64colors[ 3].G && color.B == ColorBgra.c64colors[ 3].B) { return 3; }
			else if(color.R == ColorBgra.c64colors[ 4].R && color.G == ColorBgra.c64colors[ 4].G && color.B == ColorBgra.c64colors[ 4].B) { return 4; }
			else if(color.R == ColorBgra.c64colors[ 5].R && color.G == ColorBgra.c64colors[ 5].G && color.B == ColorBgra.c64colors[ 5].B) { return 5; }
			else if(color.R == ColorBgra.c64colors[ 6].R && color.G == ColorBgra.c64colors[ 6].G && color.B == ColorBgra.c64colors[ 6].B) { return 6; }
			else if(color.R == ColorBgra.c64colors[ 7].R && color.G == ColorBgra.c64colors[ 7].G && color.B == ColorBgra.c64colors[ 7].B) { return 7; }
			else if(color.R == ColorBgra.c64colors[ 8].R && color.G == ColorBgra.c64colors[ 8].G && color.B == ColorBgra.c64colors[ 8].B) { return 8; }
			else if(color.R == ColorBgra.c64colors[ 9].R && color.G == ColorBgra.c64colors[ 9].G && color.B == ColorBgra.c64colors[ 9].B) { return 9; }
			else if(color.R == ColorBgra.c64colors[10].R && color.G == ColorBgra.c64colors[10].G && color.B == ColorBgra.c64colors[10].B) { return 10; }
			else if(color.R == ColorBgra.c64colors[11].R && color.G == ColorBgra.c64colors[11].G && color.B == ColorBgra.c64colors[11].B) { return 11; }
			else if(color.R == ColorBgra.c64colors[12].R && color.G == ColorBgra.c64colors[12].G && color.B == ColorBgra.c64colors[12].B) { return 12; }
			else if(color.R == ColorBgra.c64colors[13].R && color.G == ColorBgra.c64colors[13].G && color.B == ColorBgra.c64colors[13].B) { return 13; }
			else if(color.R == ColorBgra.c64colors[14].R && color.G == ColorBgra.c64colors[14].G && color.B == ColorBgra.c64colors[14].B) { return 14; }
			else if(color.R == ColorBgra.c64colors[15].R && color.G == ColorBgra.c64colors[15].G && color.B == ColorBgra.c64colors[15].B) { return 15; }
			else return -1;
		}

		static byte[] HBtableStable = 
		{
			0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,
			0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x9,0x9,0x9,0x9,0x9,0x9,0x6,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,
			0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x0,0x0,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x6,0x6,0x6,0x6,0x0,0x0,0x0,0x0,0x6,0x6,0x6,
			0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x8,0x8,0x8,0x8,0x8,0x8,0x6,0x6,0x6,0x6,0x6,0x0,0x0,0x6,0x6,0x6,0x6,
			//                                  ^^^ bruin
			0x2,0x2,0x9,0x9,0x9,0x2,0x2,0x2,0x2,0x9,0x2,0x2,0x9,0x9,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x4,0x6,0x6,0x6,0x6,0x6,0x0,0x6,0x6,0x6,0x4,
			0x2,0x2,0x2,0x2,0x2,0x2,0x2,0x8,0x8,0x8,0x8,0x2,0x2,0x8,0x8,0x5,0x5,0x5,0x5,0x5,0x8,0x4,0x4,0x4,0x6,0x6,0x6,0x6,0x6,0x6,0x4,0x4,
			//                  ^^^ rood
			0x4,0x4,0x2,0x2,0x2,0x2,0x8,0x8,0x8,0x8,0x8,0x8,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0x4,0x4,0x4,0x6,0x6,0x6,0x6,0x4,0x4,0x4,
			//                                  ^^^ oranje      ^^^ groen
			0x4,0x4,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0xa,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0xe,0x4,0x4,0x4,0x6,0x4,0x4,0x4,0x4,0x4,
			//                                                                                                      ^^^ blauw
			0x4,0x4,0x8,0x8,0xa,0xa,0xa,0xa,0xa,0xa,0xa,0xf,0x5,0x5,0x5,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0xe,0xe,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,
			//                                                                                                                          ^^^ paars
			0xe,0x4,0xa,0xa,0xa,0xa,0xa,0xa,0xa,0x7,0x7,0xf,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0xe,0xe,0xe,0xe,0x4,0x4,0x4,0x4,0x4,0xe,
			//                          ^^^ roze
			0xe,0xe,0xa,0xa,0xa,0xa,0xa,0xf,0xf,0x7,0x7,0x7,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0x3,0x3,0x3,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,
			//                                                  ^^^ geel                            ^^^ cyaan           ^^^ lblauw
			0xf,0xe,0xa,0xa,0xa,0xa,0xf,0xf,0xf,0x7,0x7,0x7,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0x3,0x3,0x3,0x3,0x3,0xe,0xe,0xe,0xe,0xe,0x3,0x3,
			//                                                          ^^^ lgroen
			0xf,0xf,0xf,0xf,0xa,0xa,0xa,0xf,0x7,0x7,0x7,0x7,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,
			0x7,0xf,0xf,0xf,0xf,0xf,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,
			0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0xd,
			0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,
		};

		static byte[] HBtable = 
		{
			0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,
			0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,
			0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x6,0x6,0x6,0x6,0x6,0x9,0x9,
			0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x6,0x6,0x6,0x6,0x6,0x9,0x9,
			//                                  ^^^ bruin
			0x2,0x2,0x9,0x9,0x9,0x2,0x2,0x2,0x2,0x2,0x2,0xb,0xb,0xb,0xb,0xb,0xb,0xb,0xb,0x2,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,
			0x2,0x2,0x2,0x2,0x2,0x2,0x2,0x2,0x2,0x2,0x2,0xb,0xb,0xb,0xb,0xb,0xb,0xb,0xb,0x2,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,
			//                              ^^^ rood
			0x4,0x4,0x2,0x2,0x2,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,
			//                                  ^^^ oranje
			0x4,0x4,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,
			//                                                              ^^^ groen                                       ^^^ blauw
			0x4,0x4,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0xa,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0xe,0xe,0xe,0xe,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,
			//                                                                                                                          ^^^ paars
			0xe,0xe,0xa,0xa,0xa,0xa,0xa,0xa,0xa,0xa,0xa,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,
			//                          ^^^ roze
			0xe,0xe,0xa,0xa,0xa,0xa,0xa,0xa,0xa,0xa,0xa,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0x3,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,
			//                                      ^^^ geel                                ^^^ cyaan           ^^^ lblauw
			0xf,0xf,0xf,0xf,0xf,0xf,0xf,0xf,0xf,0xf,0xf,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,
			//                                                          ^^^ lgroen
			0xf,0xf,0xf,0xf,0xf,0xf,0xf,0xf,0xf,0xf,0xf,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,
			0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,
			0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,
			0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,
		};
		
		static byte[] HBtableDither = 
		{
			0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,
			0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,

			0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,
			0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,

			0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x9,0x9,
			0x6,0x6,0x6,0x6,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x9,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,
			//                                  ^^^ bruin
			0x6,0x6,0x6,0x6,0x2,0x2,0x2,0x2,0x2,0x2,0x2,0xb,0xb,0xb,0x8,0x8,0x8,0x8,0x4,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,
			0x6,0x6,0x6,0x6,0x2,0x2,0x2,0x2,0x2,0x2,0x2,0xb,0xb,0xb,0x8,0x8,0x8,0x8,0x4,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,0x6,
			//                              ^^^ rood                                                                        ^^^ blauw
			0x4,0x4,0x4,0x4,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0xc,0xc,0xc,0x5,0x5,0x5,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,
			0x4,0x4,0x4,0x4,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0x8,0xc,0xc,0xc,0x5,0x5,0x5,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,0x4,
			//                                  ^^^ oranje                  ^^^ groen                                                   ^^^ paars
			0xe,0xe,0xe,0xe,0xa,0xa,0xa,0xa,0xa,0xa,0xa,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,
			0xe,0xe,0xe,0xe,0xa,0xa,0xa,0xa,0xa,0xa,0xa,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0x5,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,0xe,
			//                          ^^^ roze    ^^^ geel            ^^^ lgroen          ^^^ cyaan           ^^^ lblauw
			0x3,0x3,0x3,0xf,0xf,0xf,0xf,0xf,0xf,0xf,0xf,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,
			0x3,0x3,0x3,0xf,0xf,0xf,0xf,0xf,0xf,0xf,0xf,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,0x3,

			0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,
			0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0x7,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,0xd,

			0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,
			0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,

			0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,
			0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,0x1,
		};

		/*
		static byte[] HBgraytable =
		{
			0x0,
			0x0,
			0x0,
			0x0,
			0x9,
			0x9,
			0xb,
			0xb,
			0xc,
			0xc,
			0xc,
			0xc,
			0xf,
			0xf,
			0x7,
			0x7,
			0x1,
			0x1,
			0x1,
			0x1,
		};
		*/

		static byte[] HBgraytable =
		{
			0x0,
			0x0,
			0x0,
			0x0,
			0xb,
			0xb,
			0xb,
			0xb,
			0xc,
			0xc,
			0xc,
			0xc,
			0xf,
			0xf,
			0x1,
			0x1,
			0x1,
			0x1,
			0x1,
			0x1,
		};

		public static float Brightness(byte cR, byte cG, byte cB)
		{
			float max, min, l;
			float rR, rG, rB;

			rR = (float)cR / 255; rG = (float)cG / 255; rB = (float)cB / 255;

			if(rR > rG)	{ if(rR > rB) max = rR; else max = rB; }
			else		{ if(rB > rG) max = rB; else max = rG; }
			if(rR < rG)	{ if(rR < rB) min = rR; else min = rB; }
			else		{ if(rB < rG) min = rB; else min = rG; }

			l = (max + min) / 2 + 0.08f;
			if(l >= 1.0f) l = 0.9999f;

			return(l);
		}

		public static float Hue(ColorBgra color)
		{
			float h;
			float max, min, delta;
			float rR, rG, rB;
			byte cR, cG, cB;

			cR = color.R; cG = color.G; cB = color.B;

			rR = (float)cR / 255; rG = (float)cG / 255; rB = (float)cB / 255;

			if(rR > rG)	{ if(rR > rB) max = rR; else max = rB; }
			else		{ if(rB > rG) max = rB; else max = rG; }
			if(rR < rG)	{ if(rR < rB) min = rR; else min = rB; }
			else		{ if(rB < rG) min = rB; else min = rG; }

			h = 0;

			if(max != min)
			{
				delta = max - min;
				if		(rR == max)	h = 0 + (rG - rB) / delta;	// Resulting color is between magenta and yellow
				else if	(rG == max) h = 2 + (rB - rR) / delta;	// Resulting color is between yellow and cyan
				else if	(rB == max) h = 4 + (rR - rG) / delta;	// Resulting color is between cyan and magenta
			}

			return h;
		}

		public static float Saturation(ColorBgra color)
		{
			float s, l;
			float max, min;
			float rR, rG, rB;
			byte cR, cG, cB;

			cR = color.R; cG = color.G; cB = color.B;

			rR = (float)cR / 255; rG = (float)cG / 255; rB = (float)cB / 255;

			if(rR > rG)	{ if(rR > rB) max = rR; else max = rB; }
			else		{ if(rB > rG) max = rB; else max = rG; }
			if(rR < rG)	{ if(rR < rB) min = rR; else min = rB; }
			else		{ if(rB < rG) min = rB; else min = rG; }

			l = (max + min) / 2 + 0.08f;			// average lightness from 0 to 1
			if(l >= 1.0f) l = 0.9999f;

			s = 0;

			if(max != min)
			{
				// calculate saturation
				if(l <= 0.5)	s = (max - min) / (    max + min);
				else			s = (max - min) / (2 - max - min);
			}

			return s;
		}
		
		public static ColorBgra closest2(ColorBgra c1, ColorBgra c2, ColorBgra c3)
		{
			float b1, b2, b3;
			float diff1, diff2;
			float min;
			ColorBgra ret;

			b1 = Brightness(c1.R, c1.G, c1.B);
			b2 = Brightness(c2.R, c2.G, c2.B);
			b3 = Brightness(c3.R, c3.G, c3.B);

			diff1 = Math.Abs(b2-b1);
			diff2 = Math.Abs(b3-b1);

			min = diff1;
			ret = c2;

			if(diff2 < min) { min = diff2; ret = c3; }

			return ret;
		}

		public static ColorBgra closest3(ColorBgra c1, ColorBgra c2, ColorBgra c3, ColorBgra c4)
		{
			float b1, b2, b3, b4;
			float diff1, diff2, diff3;
			float min;
			ColorBgra ret;

			b1 = Brightness(c1.R, c1.G, c1.B);
			b2 = Brightness(c2.R, c2.G, c2.B);
			b3 = Brightness(c3.R, c3.G, c3.B);
			b4 = Brightness(c4.R, c4.G, c4.B);

			diff1 = Math.Abs(b2-b1);
			diff2 = Math.Abs(b3-b1);
			diff3 = Math.Abs(b4-b1);

			min = diff1;
			ret = c2;

			if(diff2 < min) { min = diff2; ret = c3; }
			if(diff3 < min) { min = diff3; ret = c4; }

			return ret;
		}

		public static ColorBgra closest4(ColorBgra c1, ColorBgra c2, ColorBgra c3, ColorBgra c4, ColorBgra c5)
		{
			float b1, b2, b3, b4, b5;
			float diff1, diff2, diff3, diff4;
			float min;
			ColorBgra ret;

			b1 = Brightness(c1.R, c1.G, c1.B);
			b2 = Brightness(c2.R, c2.G, c2.B);
			b3 = Brightness(c3.R, c3.G, c3.B);
			b4 = Brightness(c4.R, c4.G, c4.B);
			b5 = Brightness(c5.R, c5.G, c5.B);

			diff1 = Math.Abs(b2-b1);
			diff2 = Math.Abs(b3-b1);
			diff3 = Math.Abs(b4-b1);
			diff4 = Math.Abs(b5-b1);

			min = diff1;
			ret = c2;

			if(diff2 < min) { min = diff2; ret = c3; }
			if(diff3 < min) { min = diff3; ret = c4; }
			if(diff4 < min) { min = diff4; ret = c5; }

			return ret;
		}

		public static ColorBgra ConvertGrayTable(int lindex)
		{
			int index = HBgraytable[lindex+2]; // (lindex*9)/15

			return ColorBgra.FromBgra(
				ColorBgra.c64colors[index].B,
				ColorBgra.c64colors[index].G,
				ColorBgra.c64colors[index].R,
				255);
		}

		public static ColorBgra ConvertTable(int hindex, int lindex)
		{
			int index = HBtable[lindex*32+hindex];

			return ColorBgra.FromBgra(
				ColorBgra.c64colors[index].B,
				ColorBgra.c64colors[index].G,
				ColorBgra.c64colors[index].R,
				255);
		}

		public static int Index(ColorBgra color)
		{
			if(color.R == ColorBgra.c64colors[ 0].R && color.G == ColorBgra.c64colors[ 0].G && color.B == ColorBgra.c64colors[ 0].B && color.A == ColorBgra.c64colors[ 0].A) { return 0; }
			else if(color.R == ColorBgra.c64colors[ 1].R && color.G == ColorBgra.c64colors[ 1].G && color.B == ColorBgra.c64colors[ 1].B && color.A == ColorBgra.c64colors[ 1].A) { return 1; }
			else if(color.R == ColorBgra.c64colors[ 2].R && color.G == ColorBgra.c64colors[ 2].G && color.B == ColorBgra.c64colors[ 2].B && color.A == ColorBgra.c64colors[ 2].A) { return 2; }
			else if(color.R == ColorBgra.c64colors[ 3].R && color.G == ColorBgra.c64colors[ 3].G && color.B == ColorBgra.c64colors[ 3].B && color.A == ColorBgra.c64colors[ 3].A) { return 3; }
			else if(color.R == ColorBgra.c64colors[ 4].R && color.G == ColorBgra.c64colors[ 4].G && color.B == ColorBgra.c64colors[ 4].B && color.A == ColorBgra.c64colors[ 4].A) { return 4; }
			else if(color.R == ColorBgra.c64colors[ 5].R && color.G == ColorBgra.c64colors[ 5].G && color.B == ColorBgra.c64colors[ 5].B && color.A == ColorBgra.c64colors[ 5].A) { return 5; }
			else if(color.R == ColorBgra.c64colors[ 6].R && color.G == ColorBgra.c64colors[ 6].G && color.B == ColorBgra.c64colors[ 6].B && color.A == ColorBgra.c64colors[ 6].A) { return 6; }
			else if(color.R == ColorBgra.c64colors[ 7].R && color.G == ColorBgra.c64colors[ 7].G && color.B == ColorBgra.c64colors[ 7].B && color.A == ColorBgra.c64colors[ 7].A) { return 7; }
			else if(color.R == ColorBgra.c64colors[ 8].R && color.G == ColorBgra.c64colors[ 8].G && color.B == ColorBgra.c64colors[ 8].B && color.A == ColorBgra.c64colors[ 8].A) { return 8; }
			else if(color.R == ColorBgra.c64colors[ 9].R && color.G == ColorBgra.c64colors[ 9].G && color.B == ColorBgra.c64colors[ 9].B && color.A == ColorBgra.c64colors[ 9].A) { return 9; }
			else if(color.R == ColorBgra.c64colors[10].R && color.G == ColorBgra.c64colors[10].G && color.B == ColorBgra.c64colors[10].B && color.A == ColorBgra.c64colors[10].A) { return 10; }
			else if(color.R == ColorBgra.c64colors[11].R && color.G == ColorBgra.c64colors[11].G && color.B == ColorBgra.c64colors[11].B && color.A == ColorBgra.c64colors[11].A) { return 11; }
			else if(color.R == ColorBgra.c64colors[12].R && color.G == ColorBgra.c64colors[12].G && color.B == ColorBgra.c64colors[12].B && color.A == ColorBgra.c64colors[12].A) { return 12; }
			else if(color.R == ColorBgra.c64colors[13].R && color.G == ColorBgra.c64colors[13].G && color.B == ColorBgra.c64colors[13].B && color.A == ColorBgra.c64colors[13].A) { return 13; }
			else if(color.R == ColorBgra.c64colors[14].R && color.G == ColorBgra.c64colors[14].G && color.B == ColorBgra.c64colors[14].B && color.A == ColorBgra.c64colors[14].A) { return 14; }
			else if(color.R == ColorBgra.c64colors[15].R && color.G == ColorBgra.c64colors[15].G && color.B == ColorBgra.c64colors[15].B && color.A == ColorBgra.c64colors[15].A) { return 15; }
			else if(color.A < 255) return 16;
			else
			{
				return NaturalRamp(color.R, color.G, color.B, 0, 0, 0, 0, 0, 0);
			}
		}

		public static int LightIndex(int index)
		{
			if(index == 0) return 0;
			else if(index == 1) return 15;
			else if(index == 2) return 4;
			else if(index == 3) return 11;
			else if(index == 4) return 6;
			else if(index == 5) return 8;
			else if(index == 6) return 2;
			else if(index == 7) return 13;
			else if(index == 8) return 6;
			else if(index == 9) return 2;
			else if(index == 10) return 9;
			else if(index == 11) return 4;
			else if(index == 12) return 9;
			else if(index == 13) return 13;
			else if(index == 14) return 9;
			else if(index == 15) return 11;
			else if(index == 16) return 0;
			else return -1;
		}

		static int[] ditherpattern1 =
		{
			0,0,0,0,
			0,0,0,0,
			0,0,0,0,
			0,0,0,0,

			1,0,0,0,
			0,0,0,0,
			0,0,1,0,
			0,0,0,0,

			1,0,1,0,
			0,0,0,0,
			1,0,1,0,
			0,0,0,0,

			1,0,1,0,
			0,1,0,1,
			1,0,1,0,
			0,1,0,1,

			1,1,1,1,
			0,1,0,1,
			1,1,1,1,
			0,1,0,1,

			1,1,1,1,
			1,1,0,1,
			1,1,1,1,
			0,1,1,1,
		};

		static int[] ditherpattern2 =
		{
			0,0,0,0,
			0,0,0,0,
			0,0,0,0,
			0,0,0,0,

			0,0,0,0,
			1,0,0,0,
			0,0,0,0,
			0,0,1,0,

			0,0,0,0,
			1,0,1,0,
			0,0,0,0,
			1,0,1,0,

			0,1,0,1,
			1,0,1,0,
			0,1,0,1,
			1,0,1,0,

			0,1,0,1,
			1,1,1,1,
			0,1,0,1,
			1,1,1,1,

			1,1,0,1,
			1,1,1,1,
			0,1,1,1,
			1,1,1,1,
		};

		static int[] ditherpattern3 =
		{
			0,0,0,0,
			0,0,0,0,
			0,0,0,0,
			0,0,0,0,

			1,0,0,0,
			0,0,0,0,
			0,0,0,0,
			0,0,0,0,

			1,0,0,0,
			0,0,0,0,
			0,0,1,0,
			0,0,0,0,

			1,0,1,0,
			0,0,0,0,
			1,0,1,0,
			0,0,0,0,

			1,0,1,1,
			0,0,0,0,
			1,1,1,0,
			0,0,0,0,

			1,1,1,1,
			0,0,0,0,
			1,1,1,1,
			0,0,0,0,
		};

		static int[] ditherpattern4 =
		{
			0,0,0,0,
			0,0,0,0,
			0,0,0,0,
			0,0,0,0,

			0,0,0,0,
			1,0,0,0,
			0,0,0,0,
			0,0,0,0,

			0,0,0,0,
			1,0,0,0,
			0,0,0,0,
			0,0,1,0,

			0,0,0,0,
			1,0,1,0,
			0,0,0,0,
			1,0,1,0,

			0,0,0,0,
			1,0,1,1,
			0,0,0,0,
			1,1,1,0,

			0,0,0,0,
			1,1,1,1,
			0,0,0,0,
			1,1,1,1,
		};

		public static byte NaturalRamp(byte cR, byte cG, byte cB, int x, int y, int bdmi, int hdmi, int sdmi, float saturation)
		{
			float h, s, l;
			float max, min, delta;
			float rR, rG, rB;
			int hindex, lindex;
			int badd, hadd, sadd;
			bool saturated, middlesaturated;

			rR = (float)cR / 255; rG = (float)cG / 255; rB = (float)cB / 255;

			if(rR > rG)	{ if(rR > rB) max = rR; else max = rB; }
			else		{ if(rB > rG) max = rB; else max = rG; }
			if(rR < rG)	{ if(rR < rB) min = rR; else min = rB; }
			else		{ if(rB < rG) min = rB; else min = rG; }

			// l = (max + min) / 2; // average lightness from 0 to 1

			l = ((max + min) + 0.214f * rB + 0.587f * rG + 0.199f * rR) / 3;

			s = 0; h = 0;

			if(max != min)
			{
				if(l <= 0.5)	s = (max - min) / (    max + min);
				else			s = (max - min) / (2 - max - min);
				s = s + saturation/50 + 0.20f;

				delta = max - min;
				if		(rR == max)	h = 0 + (rG - rB) / delta;	// Resulting color is between magenta and yellow
				else if	(rG == max) h = 2 + (rB - rR) / delta;	// Resulting color is between yellow and cyan
				else if	(rB == max) h = 4 + (rR - rG) / delta;	// Resulting color is between cyan and magenta
			}

			h += 1.0f;

			#region clamp values
			if(h > 6.0f) h -= 6.0f; else if (h < 0.0f) h += 6.0f;
			// if(s > 1.0f) s = 1.0f; else if (s < 0.0f) s = 0.0f;
			#endregion

			hindex = (int)((h/6)*31);
			lindex = (int)(l*10)-1;
			lindex *= 2;
			if(lindex < 0) lindex = 0;
			if(y%2 == 1) lindex++;

			int l2 = (int)(l*10*6)%6;
			int h2 = (int)((h/6)*31*6)%6;
			int h3 = (int)((h/6)*31*6*3)%3;
			int g2 = (int)(s*12);
			saturated = (g2 > 11);
			middlesaturated = (g2 > 6) && (g2 < 12);

			badd = 0;
			hadd = 0;
			sadd = 0;

			switch(bdmi)
			{
				case 0: badd = 0; break;
				case 1: badd = 2*ditherpattern1[(l2/3) * 3 * 16 + y%4*4 + x%4]; break; // 2x2 dither
				case 2: badd = 2*ditherpattern2[(l2/3) * 3 * 16 + y%4*4 + x%4]; break; // 2x2 dither
				case 3: badd = 2*ditherpattern1[l2 * 16 + y%4*4 + x%4]; break; // 2x2 3 gradient dither
				case 4: badd = 2*ditherpattern2[l2 * 16 + y%4*4 + x%4]; break; // 2x2 3 gradient dither
				case 5: badd = 2*ditherpattern3[l2 * 16 + y%4*4 + x%4]; break; // horizontal dither
				case 6: badd = 2*ditherpattern4[l2 * 16 + y%4*4 + x%4]; break; // horizontal dither
				default: break;
			}

			switch(hdmi)
			{
				case 0: hadd = 0; break;
				case 1: hadd = ditherpattern1[(h2/3) * 3 * 16 + y%4*4 + x%4]; break; // 2x2 dither
				case 2: hadd = ditherpattern2[(h2/3) * 3 * 16 + y%4*4 + x%4]; break; // 2x2 dither
				case 3: hadd = ditherpattern1[h2 * 16 + y%4*4 + x%4]; break; // 2x2 3 gradient dither
				case 4: hadd = ditherpattern2[h2 * 16 + y%4*4 + x%4]; break; // 2x2 3 gradient dither
				case 5: hadd = ditherpattern2[h2 * 16 + y%4*4 + x%4]; break; // horizontal dither
				case 6: hadd = ditherpattern3[h2 * 16 + y%4*4 + x%4]; break; // horizontal dither
				default: break;
			}

			if(g2 < 0) sadd = 1;
			else if(g2 >= 6) sadd = 0;
			else
			{
				switch(sdmi)
				{
					case 0: sadd = 1; break;
					case 1: sadd = 1-ditherpattern1[(g2/3) * 3 * 16 + y%4*4 + x%4]; break; // 2x2 dither
					case 2: sadd = 1-ditherpattern2[(g2/3) * 3 * 16 + y%4*4 + x%4]; break; // 2x2 dither
					case 3: sadd = 1-ditherpattern1[g2 * 16 + y%4*4 + x%4]; break; // 2x2 3 gradient dither
					case 4: sadd = 1-ditherpattern2[g2 * 16 + y%4*4 + x%4]; break; // 2x2 3 gradient dither
					case 5: sadd = 1-ditherpattern3[g2 * 16 + y%4*4 + x%4]; break; // horizontal dither
					case 6: sadd = 1-ditherpattern4[g2 * 16 + y%4*4 + x%4]; break; // horizontal dither
					default: break;
				}
			}

			lindex += badd;
			hindex += hadd;

			if(hindex > 31) hindex -= 32;
			if(hindex < 0) hindex += 32;

			if(lindex > 19) lindex = 19;
			if(lindex < 0) lindex = 0;

			if(sadd == 1) return HBgraytable[lindex];
			else return HBtableDither[lindex*32+hindex];
		}

		public static byte NaturalRampStable(byte cR, byte cG, byte cB, bool higher, bool dithergray)
		{
			float h, s, l;
			float max, min, delta;
			float rR, rG, rB;
			int hindex, lindex;

			rR = (float)cR / 255; rG = (float)cG / 255; rB = (float)cB / 255;

			if(rR > rG)	{ if(rR > rB) max = rR; else max = rB; }
			else		{ if(rB > rG) max = rB; else max = rG; }
			if(rR < rG)	{ if(rR < rB) min = rR; else min = rB; }
			else		{ if(rB < rG) min = rB; else min = rG; }

			l = (max + min) / 2 + 0.08f;			// average lightness from 0 to 1
			if(l >= 1.0f) l = 0.999f;

			s = 0; h = 0;

			if(max != min)
			{
				// calculate saturation
				if(l <= 0.5)	s = (max - min) / (    max + min);
				else			s = (max - min) / (2 - max - min);
				
				// calculate hue
				delta = max - min;
				if		(rR == max)	h = 0 + (rG - rB) / delta;	// Resulting color is between magenta and yellow
				else if	(rG == max) h = 2 + (rB - rR) / delta;	// Resulting color is between yellow and cyan
				else if	(rB == max) h = 4 + (rR - rG) / delta;	// Resulting color is between cyan and magenta
			}

			hindex = (int)((h+1)*(31/6));
			lindex = (int)(l*15);

			if(higher)
			{
				lindex++;
			}

			if(dithergray)
			{
				hindex++;
				if(hindex < 0) hindex = 31;
			}

			if(s > 0.2)
			{
				return HBtableStable[lindex*32+hindex];
			}
			else if(s > 0.1)
			{
				if(dithergray && higher)
				{
					if(lindex < 4) return 0;
					else if(lindex < 7) return 11;
					else if(lindex < 9) return 12;
					else if(lindex < 13) return 15;
					else return 1;
				}
				else
				{
					return HBtableStable[lindex*32+hindex];
				}
			}
			else
			{
				if(lindex < 4) return 0;
				else if(lindex < 7) return 11;
				else if(lindex < 9) return 12;
				else if(lindex < 13) return 15;
				else return 1;
			}
		}

		public static ColorBgra CalcHueSaturation(ColorBgra color, float hue, float saturation, bool colorize)
		{
			float h, s, l;
			float max, min, delta;
			float rR, rG, rB;
			byte cR, cG, cB;

			if(!colorize) saturation = 0.0f;

			cR = color.R; cG = color.G; cB = color.B;

			rR = (float)cR / 255; rG = (float)cG / 255; rB = (float)cB / 255;

			if(rR > rG)	{ if(rR > rB) max = rR; else max = rB; }
			else		{ if(rB > rG) max = rB; else max = rG; }
			if(rR < rG)	{ if(rR < rB) min = rR; else min = rB; }
			else		{ if(rB < rG) min = rB; else min = rG; }

			// l = (max + min) / 2; //  + 0.08f;			// average lightness from 0 to 1
			// if(l >= 1.0f) l = 0.9999f;

			l = 0.114f * rB + 0.587f * rG + 0.299f * rR;

			s = 0; h = 0;

			if(max != min)
			{
				// calculate saturation
				if(l <= 0.5)	s = (max - min) / (    max + min);
				else			s = (max - min) / (2 - max - min);
				
				// calculate hue
				delta = max - min;
				if		(rR == max)	h = 0 + (rG - rB) / delta;	// Resulting color is between yellow and magenta
				else if	(rG == max) h = 2 + (rB - rR) / delta;	// Resulting color is between cyan and yellow
				else if	(rB == max) h = 4 + (rR - rG) / delta;	// Resulting color is between magenta and cyan
			}

			// we've got the correct HSL values here, do dialog conversion
			if(colorize)
			{
				h = hue;
				s = saturation;
			}
			else
			{
				h += hue;
				s += saturation;
			}

			#region clamp values
			if(h > 5.0f) h -= 6.0f; else if (h < -1.0f) h += 6.0f;
			if(s > 1.0f) s = 1.0f; else if (s < 0.0f) s = 0.0f;
			#endregion

			if(s == 0) // achromatic case
			{
				rR = l;
				rG = l;
				rB = l;
			}
			else // chromatic case
			{
				if(l <= 0.5)	{ min =     l * (1 - s);	/* s = (max - min) / (    max + min); */ }
				else			{ min = l - s * (1 - l);	/* s = (max - min) / (2 - max - min); */ }

				max = 2 * l - min;
				delta = max - min;

				// depending on sector, evaluate h, s, l
				if(h < 1)
				{
					rR = max;
					if(h < 0)	{ rG = min; rB = rG - h * delta; }
					else		{ rB = min; rG = rB + h * delta; }
				}
				else
				{
					if(h < 3)
					{
						rG = max;
						if(h < 2)	{ rB = min; rR = rB - (h - 2) * delta; }
						else		{ rR = min; rB = rR + (h - 2) * delta; }
					}
					else // (h < 5)
					{
						rB = max;
						if(h < 4)	{ rR = min; rG = rR - (h - 4) * delta; }
						else		{ rG = min; rR = rG + (h - 4) * delta; }
					}
				}
			}

			int r = (int)(rR * 255);
			int g = (int)(rG * 255);
			int b = (int)(rB * 255);

			#region clamp values to [0,255]
			if(r > 255) r = 255; else if (r < 0) r = 0;
			if(g > 255) g = 255; else if (g < 0) g = 0;
			if(b > 255) b = 255; else if (b < 0) b = 0;
			#endregion

			return ColorBgra.FromBgra((byte)b, (byte)g, (byte)r, color.A);
		}

		public static ColorBgra CalcBrightnessContrast(ColorBgra color, float brightness, float contrast)
		{
			int r = 128 + (int)((color.R - 128) * contrast) + (int)(brightness * 255);
			int g = 128 + (int)((color.G - 128) * contrast) + (int)(brightness * 255);
			int b = 128 + (int)((color.B - 128) * contrast) + (int)(brightness * 255);

			#region clamp values to [0,255]
			if(r > 255) r = 255; else if (r < 0) r = 0;
			if(g > 255) g = 255; else if (g < 0) g = 0;
			if(b > 255) b = 255; else if (b < 0) b = 0;
			#endregion

			return ColorBgra.FromBgra((byte)b, (byte)g, (byte)r, color.A);
		}

		public static ColorBgra CalcRamp(ColorBgra color, int x, int y, int brightnessdithermodeindex, int huedithermodeindex, int saturationdithermodeindex, float saturation)
		{
			byte index;

			index = ColorBgra.NaturalRamp(color.R, color.G, color.B, x, y, brightnessdithermodeindex, huedithermodeindex, saturationdithermodeindex, saturation);

			return ColorBgra.FromBgra(
				ColorBgra.c64colors[index].B,
				ColorBgra.c64colors[index].G,
				ColorBgra.c64colors[index].R,
				(color.A < 128 ? (byte)0: (byte)255));
		}		

		public static ColorBgra CalcRampQuickStable(ColorBgra color)
		{
			byte index;

			if(color.R == ColorBgra.c64colors[ 0].R && color.G == ColorBgra.c64colors[ 0].G && color.B == ColorBgra.c64colors[ 0].B && color.A == ColorBgra.c64colors[ 0].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 1].R && color.G == ColorBgra.c64colors[ 1].G && color.B == ColorBgra.c64colors[ 1].B && color.A == ColorBgra.c64colors[ 1].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 2].R && color.G == ColorBgra.c64colors[ 2].G && color.B == ColorBgra.c64colors[ 2].B && color.A == ColorBgra.c64colors[ 2].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 3].R && color.G == ColorBgra.c64colors[ 3].G && color.B == ColorBgra.c64colors[ 3].B && color.A == ColorBgra.c64colors[ 3].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 4].R && color.G == ColorBgra.c64colors[ 4].G && color.B == ColorBgra.c64colors[ 4].B && color.A == ColorBgra.c64colors[ 4].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 5].R && color.G == ColorBgra.c64colors[ 5].G && color.B == ColorBgra.c64colors[ 5].B && color.A == ColorBgra.c64colors[ 5].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 6].R && color.G == ColorBgra.c64colors[ 6].G && color.B == ColorBgra.c64colors[ 6].B && color.A == ColorBgra.c64colors[ 6].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 7].R && color.G == ColorBgra.c64colors[ 7].G && color.B == ColorBgra.c64colors[ 7].B && color.A == ColorBgra.c64colors[ 7].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 8].R && color.G == ColorBgra.c64colors[ 8].G && color.B == ColorBgra.c64colors[ 8].B && color.A == ColorBgra.c64colors[ 8].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 9].R && color.G == ColorBgra.c64colors[ 9].G && color.B == ColorBgra.c64colors[ 9].B && color.A == ColorBgra.c64colors[ 9].A) { return color; }
			else if(color.R == ColorBgra.c64colors[10].R && color.G == ColorBgra.c64colors[10].G && color.B == ColorBgra.c64colors[10].B && color.A == ColorBgra.c64colors[10].A) { return color; }
			else if(color.R == ColorBgra.c64colors[11].R && color.G == ColorBgra.c64colors[11].G && color.B == ColorBgra.c64colors[11].B && color.A == ColorBgra.c64colors[11].A) { return color; }
			else if(color.R == ColorBgra.c64colors[12].R && color.G == ColorBgra.c64colors[12].G && color.B == ColorBgra.c64colors[12].B && color.A == ColorBgra.c64colors[12].A) { return color; }
			else if(color.R == ColorBgra.c64colors[13].R && color.G == ColorBgra.c64colors[13].G && color.B == ColorBgra.c64colors[13].B && color.A == ColorBgra.c64colors[13].A) { return color; }
			else if(color.R == ColorBgra.c64colors[14].R && color.G == ColorBgra.c64colors[14].G && color.B == ColorBgra.c64colors[14].B && color.A == ColorBgra.c64colors[14].A) { return color; }
			else if(color.R == ColorBgra.c64colors[15].R && color.G == ColorBgra.c64colors[15].G && color.B == ColorBgra.c64colors[15].B && color.A == ColorBgra.c64colors[15].A) { return color; }
			else
			{
				index = ColorBgra.NaturalRampStable(color.R, color.G, color.B, false, false);

				return ColorBgra.FromBgra(
					ColorBgra.c64colors[index].B,
					ColorBgra.c64colors[index].G,
					ColorBgra.c64colors[index].R,
					(color.A < 128 ? (byte)0: (byte)255)); // HACK, do we really want this?
			}
		}		

		public static ColorBgra CalcRampQuick(ColorBgra color)
		{
			byte index;

			if(color.R == ColorBgra.c64colors[ 0].R && color.G == ColorBgra.c64colors[ 0].G && color.B == ColorBgra.c64colors[ 0].B && color.A == ColorBgra.c64colors[ 0].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 1].R && color.G == ColorBgra.c64colors[ 1].G && color.B == ColorBgra.c64colors[ 1].B && color.A == ColorBgra.c64colors[ 1].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 2].R && color.G == ColorBgra.c64colors[ 2].G && color.B == ColorBgra.c64colors[ 2].B && color.A == ColorBgra.c64colors[ 2].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 3].R && color.G == ColorBgra.c64colors[ 3].G && color.B == ColorBgra.c64colors[ 3].B && color.A == ColorBgra.c64colors[ 3].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 4].R && color.G == ColorBgra.c64colors[ 4].G && color.B == ColorBgra.c64colors[ 4].B && color.A == ColorBgra.c64colors[ 4].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 5].R && color.G == ColorBgra.c64colors[ 5].G && color.B == ColorBgra.c64colors[ 5].B && color.A == ColorBgra.c64colors[ 5].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 6].R && color.G == ColorBgra.c64colors[ 6].G && color.B == ColorBgra.c64colors[ 6].B && color.A == ColorBgra.c64colors[ 6].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 7].R && color.G == ColorBgra.c64colors[ 7].G && color.B == ColorBgra.c64colors[ 7].B && color.A == ColorBgra.c64colors[ 7].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 8].R && color.G == ColorBgra.c64colors[ 8].G && color.B == ColorBgra.c64colors[ 8].B && color.A == ColorBgra.c64colors[ 8].A) { return color; }
			else if(color.R == ColorBgra.c64colors[ 9].R && color.G == ColorBgra.c64colors[ 9].G && color.B == ColorBgra.c64colors[ 9].B && color.A == ColorBgra.c64colors[ 9].A) { return color; }
			else if(color.R == ColorBgra.c64colors[10].R && color.G == ColorBgra.c64colors[10].G && color.B == ColorBgra.c64colors[10].B && color.A == ColorBgra.c64colors[10].A) { return color; }
			else if(color.R == ColorBgra.c64colors[11].R && color.G == ColorBgra.c64colors[11].G && color.B == ColorBgra.c64colors[11].B && color.A == ColorBgra.c64colors[11].A) { return color; }
			else if(color.R == ColorBgra.c64colors[12].R && color.G == ColorBgra.c64colors[12].G && color.B == ColorBgra.c64colors[12].B && color.A == ColorBgra.c64colors[12].A) { return color; }
			else if(color.R == ColorBgra.c64colors[13].R && color.G == ColorBgra.c64colors[13].G && color.B == ColorBgra.c64colors[13].B && color.A == ColorBgra.c64colors[13].A) { return color; }
			else if(color.R == ColorBgra.c64colors[14].R && color.G == ColorBgra.c64colors[14].G && color.B == ColorBgra.c64colors[14].B && color.A == ColorBgra.c64colors[14].A) { return color; }
			else if(color.R == ColorBgra.c64colors[15].R && color.G == ColorBgra.c64colors[15].G && color.B == ColorBgra.c64colors[15].B && color.A == ColorBgra.c64colors[15].A) { return color; }
			else
			{
				index = ColorBgra.NaturalRamp(color.R, color.G, color.B, 0, 0, 0, 0, 0, 0);

				return ColorBgra.FromBgra(
					ColorBgra.c64colors[index].B,
					ColorBgra.c64colors[index].G,
					ColorBgra.c64colors[index].R,
					(color.A < 128 ? (byte)0: (byte)255)); // HACK, do we really want this?
			}
		}		
	}
}
