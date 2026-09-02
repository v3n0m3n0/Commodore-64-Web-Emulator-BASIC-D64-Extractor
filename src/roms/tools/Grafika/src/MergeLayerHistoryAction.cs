using System;
using System.Drawing;

namespace PaintDotNet
{
	/// <summary>
	/// Summary description for MergeLayerHistoryAction.
	/// </summary>
	public class MergeLayerHistoryAction
        : HistoryAction
	{
		private int index;
		private DocumentWorkspace workspace;
		private BitmapLayer bitmapLayer;
		private RenderArgs renderArgs;

		[Serializable]
			private sealed class MergeLayerHistoryActionData
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

			public MergeLayerHistoryActionData(Layer layer)
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
			MergeLayerHistoryActionData data = (MergeLayerHistoryActionData)this.Data;
			HistoryAction ha = new NewLayerHistoryAction(Name, Image, workspace, index);
			workspace.Document.Layers.Insert(index, data.Layer);

			// ((Layer)workspace.Document.Layers[index]).Invalidate();
			workspace.Document.Invalidate();
			
			return ha;
        }

		public MergeLayerHistoryAction(string name, Image image, DocumentWorkspace workspace, Layer mergeToMe)
            : base(name, image)
		{
			this.workspace = workspace;
			this.index = workspace.Document.Layers.IndexOf(mergeToMe);
			this.Data = new MergeLayerHistoryActionData(mergeToMe);

			// creates a bitmap layer from the active layer
			bitmapLayer = (BitmapLayer)workspace.Document.Layers[this.index];
			// create Graphics object
			renderArgs = new RenderArgs(bitmapLayer.Surface);
			// render the first layer into the one above
			((Layer)workspace.Document.Layers[this.index+1]).Render(renderArgs, renderArgs.Surface.Bounds);
		}
	}
}
