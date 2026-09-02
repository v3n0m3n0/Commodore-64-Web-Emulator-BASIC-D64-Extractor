using System;
using System.Drawing;

namespace PaintDotNet
{
	/// <summary>
	/// Summary description for BurnLayerHistoryAction.
	/// </summary>
	public class BurnLayerHistoryAction
        : HistoryAction
	{
		private int index;
		private DocumentWorkspace workspace;
		private BitmapLayer bitmapLayer;
		private RenderArgs renderArgs;

		[Serializable]
			private sealed class BurnLayerHistoryActionData
			: HistoryActionData
		{
			private Layer layer;

			public Layer Layer
			{
				get
				{
					return layer;
				}
			}

			public BurnLayerHistoryActionData(Layer layer)
			{
				this.layer = layer;
			}

			protected override void Dispose(bool disposing)
			{
			}

		}

		protected override HistoryAction OnUndo()
        {
			workspace.Document.Layers.RemoveAt(index);
			BurnLayerHistoryActionData data = (BurnLayerHistoryActionData)this.Data;
			HistoryAction ha = new NewLayerHistoryAction(Name, Image, workspace, index);
			workspace.Document.Layers.Insert(index, data.Layer);

			workspace.Document.Invalidate();
			
			return ha;
        }

		public BurnLayerHistoryAction(string name, Image image, DocumentWorkspace workspace, Layer burnFromMe)
            : base(name, image)
		{
			this.workspace = workspace;
			this.index = workspace.Document.Layers.IndexOf(burnFromMe)-1;
			this.Data = new BurnLayerHistoryActionData(burnFromMe);

			bitmapLayer = (BitmapLayer)workspace.Document.Layers[this.index];
			renderArgs = new RenderArgs(bitmapLayer.Surface);

			((Layer)workspace.Document.Layers[this.index+1]).Render(renderArgs, renderArgs.Surface.Bounds);
		}
	}
}
