using System;

namespace PaintDotNet
{
    /// <summary>
    /// Summary description for C64SaveConfigToken.
    /// </summary>
    public class C64SaveConfigToken
        : SaveConfigToken
    {
        /*
		private int quality;
        public int Quality
        {
            get
            {
                return quality;
            }

            set
            {
                if (value < 0 || value > 100)
                {
                    throw new ArgumentOutOfRangeException("quality must be 0 to 100, inclusive");
                }

                this.quality = value;
            }
        }
		*/

        public C64SaveConfigToken(int quality)
        {
            if (quality < 0 || quality > 100)
            {
                throw new ArgumentOutOfRangeException("quality must be 0 to 100, inclusive");
            }
            
            // this.quality = quality;
        }

        protected C64SaveConfigToken(C64SaveConfigToken cloneMe)
        {
            // this.quality = cloneMe.quality;
        }

        public override object Clone()
        {
            return new C64SaveConfigToken(this);
        }
    }
}
