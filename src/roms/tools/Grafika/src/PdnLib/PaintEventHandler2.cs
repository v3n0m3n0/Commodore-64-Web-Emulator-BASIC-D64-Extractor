using System;

namespace PaintDotNet
{
	/// <summary>
    /// Gets around a limitation in System.Windows.Forms.PaintEventArgs in that it disposes
    /// the Graphics instance that is associated with it when it is disposed.
    /// </summary>
    public delegate void PaintEventHandler2(object sender, PaintEventArgs2 e);
}
