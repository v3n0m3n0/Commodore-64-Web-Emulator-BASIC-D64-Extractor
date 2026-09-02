using System;

namespace PaintDotNet
{
	/// <summary>
	/// Stores data that should be serializable/deserializable
	/// for a HistoryAction.
	/// </summary>
	[Serializable]
	public abstract class HistoryActionData
        : IDisposable
    {
        ~HistoryActionData()
        {
            Dispose(false);
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected abstract void Dispose(bool disposing);
    }
}
