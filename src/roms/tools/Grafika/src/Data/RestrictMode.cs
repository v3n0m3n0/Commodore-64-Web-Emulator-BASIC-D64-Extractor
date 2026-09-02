using System;

namespace PaintDotNet
{
    [Serializable]
	// public interface RestrictMode
    public abstract class RestrictMode
    {
        public override string ToString()
        {
            return Utility.GetStaticName(this.GetType());
        }

		public bool IsDoublePixel()
		{
			return Utility.GetDoublePixel(this.GetType());
		}

		public RestrictMode()
		{
		}
    }
}
