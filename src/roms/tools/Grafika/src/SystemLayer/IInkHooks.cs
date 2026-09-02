using System;
using System.Drawing;
using System.Windows.Forms;

namespace PaintDotNet.SystemLayer
{
	/// <summary>
	/// Summary description for IInkHooks.
	/// </summary>
	public interface IInkHooks
	{
        void PerformDocumentMouseMove(MouseButtons button, int clicks, float x, float y, int delta, float pressure);
        void PerformDocumentMouseUp(MouseButtons button, int clicks, float x, float y, int delta, float pressure);
        void PerformDocumentMouseDown(MouseButtons button, int clicks, float x, float y, int delta, float pressure);
        System.Drawing.Graphics CreateGraphics();
        PointF ScreenToDocument(PointF pointF);
	}
}
