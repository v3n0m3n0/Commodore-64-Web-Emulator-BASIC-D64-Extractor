using System;
using System.Drawing;

namespace PaintDotNet
{
	/// <summary>
	/// Gets around a limitation in System.Windows.Forms.PaintEventArgs in that it disposes
	/// the Graphics instance that is associated with it when it is disposed.
	/// </summary>
	public class PaintEventArgs2
        : EventArgs
	{
        private Graphics graphics;
        public Graphics Graphics
        {
            get
            {
                return graphics;
            }
        }

        private Rectangle clipRectangle;
        public Rectangle ClipRectangle
        {
            get
            {
                return clipRectangle;
            }
        }

		public PaintEventArgs2(Graphics graphics, Rectangle clipRectangle)
		{
            this.graphics = graphics;
            this.clipRectangle = clipRectangle;
		}
	}
}
