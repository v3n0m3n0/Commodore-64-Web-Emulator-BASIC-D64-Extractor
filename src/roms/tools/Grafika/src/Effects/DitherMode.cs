using System;

namespace PaintDotNet
{
    [Serializable]
	// public interface DitherMode
    public abstract class DitherMode
    {
        public override string ToString()
        {
            return Utility.GetStaticName(this.GetType());
        }

		public int ThisIndexNumber()
		{
			return Utility.GetIndexNumber(this.GetType());
		}

		public DitherMode()
		{
		}
    }
}
