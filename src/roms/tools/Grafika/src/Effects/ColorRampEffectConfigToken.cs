using System;

namespace PaintDotNet.Effects
{
	/// <summary>
	/// Summary description for ColorRampEffectConfigToken.
	/// </summary>
	public class ColorRampEffectConfigToken
        : EffectConfigToken
	{
		private int hue;
		public int Hue
		{
			get
			{
				return hue;
			}

			set
			{
				this.hue = value;
			}
		}

		private int saturation;
		public int Saturation
		{
			get
			{
				return saturation;
			}

			set
			{
				this.saturation = value;
			}
		}
		
		private int brightness;
		public int Brightness
		{
			get
			{
				return brightness;
			}

			set
			{
				this.brightness = value;
			}
		}

		private int contrast;
		public int Contrast
		{
			get
			{
				return contrast;
			}

			set
			{
				this.contrast = value;
			}
		}

		private bool colorize;
		public bool Colorize
		{
			get
			{
				return colorize;
			}

			set
			{
				this.colorize = value;
			}
		}

		private bool preview;
		public bool Preview
		{
			get
			{
				return preview;
			}

			set
			{
				this.preview = value;
			}
		}

		private bool doublepixel;
		public bool Doublepixel
		{
			get
			{
				return doublepixel;
			}

			set
			{
				this.doublepixel = value;
			}
		}

		private DitherMode brightnessdithermode;
		public DitherMode BrightnessDithermode
		{
			get
			{
				return brightnessdithermode;
			}

			set
			{
				this.brightnessdithermode = value;
			}
		}

		private DitherMode huedithermode;
		public DitherMode HueDithermode
		{
			get
			{
				return huedithermode;
			}

			set
			{
				this.huedithermode = value;
			}
		}

		private DitherMode saturationdithermode;
		public DitherMode SaturationDithermode
		{
			get
			{
				return saturationdithermode;
			}

			set
			{
				this.saturationdithermode = value;
			}
		}

		private bool preserve;
		public bool Preserve
		{
			get
			{
				return preserve;
			}

			set
			{
				this.preserve = value;
			}
		}

		public DitherMode GetBrightnessDitherMode
		{
			get
			{
				return brightnessdithermode;
			}
		}

		public void SetBrightnessDitherMode(DitherMode brightnessditherMode)
		{
			if (this.brightnessdithermode.GetType() != brightnessditherMode.GetType())
			{
				this.brightnessdithermode = brightnessditherMode;
			}
		}

		public DitherMode GetHueDitherMode
		{
			get
			{
				return huedithermode;
			}
		}

		public void SetHueDitherMode(DitherMode hueditherMode)
		{
			if (this.huedithermode.GetType() != hueditherMode.GetType())
			{
				this.huedithermode = hueditherMode;
			}
		}

		public DitherMode GetSaturationDitherMode
		{
			get
			{
				return saturationdithermode;
			}
		}

		public void SetSaturationDitherMode(DitherMode saturationditherMode)
		{
			if (this.saturationdithermode.GetType() != saturationditherMode.GetType())
			{
				this.saturationdithermode = saturationditherMode;
			}
		}

		public override object Clone()
        {
            return new ColorRampEffectConfigToken(this);
        }

        public ColorRampEffectConfigToken(bool preview, int hue, int saturation, int steps, int brightness, int contrast, bool doublepixel, bool colorize, bool preserve, DitherMode brightnessdithermode, DitherMode huedithermode, DitherMode saturationdithermode)
            : base()
        {
			this.preview = true;
			this.hue = hue;
			this.saturation = saturation;
			this.brightness = brightness;
			this.contrast = contrast;
			this.doublepixel = doublepixel;
			this.colorize = colorize;
			this.preserve = preserve;
			this.brightnessdithermode = brightnessdithermode;
			this.huedithermode = huedithermode;
			this.saturationdithermode = saturationdithermode;
		}

        protected ColorRampEffectConfigToken(ColorRampEffectConfigToken copyMe)
            : base(copyMe)
        {
			this.preview = copyMe.preview;
			this.hue = copyMe.hue;
			this.saturation = copyMe.saturation;
			this.brightness = copyMe.brightness;
			this.contrast = copyMe.contrast;
			this.doublepixel = copyMe.doublepixel;
			this.colorize = copyMe.colorize;
			this.preserve = copyMe.preserve;
			this.brightnessdithermode = copyMe.brightnessdithermode;
			this.huedithermode = copyMe.huedithermode;
			this.saturationdithermode = copyMe.saturationdithermode;
		}
	}
}
