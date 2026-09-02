using System;
using System.Drawing;

namespace PaintDotNet
{
    /// <summary>
    /// Summary description for DeselectAction.
    /// </summary>
    public class DeselectAction
        : DocumentAction
    {
        public static string StaticName
        {
            get
            {
                return "Deselect";
            }
        }

        public static Image StaticImage
        {
            get
            {
                return Utility.GetImageResource("Icons.MenuEditDeselectIcon.bmp");
            }
        }
        
        public override HistoryAction PerformAction()
        {
            if (Workspace.Environment.IsSelectionEmpty)
            {
                return null;
            }
            else
            {
                SelectionHistoryAction sha = new SelectionHistoryAction(Name, StaticImage, Workspace);

                Workspace.Environment.PerformSelectedPathChanging();
                Workspace.Environment.SelectedPath.Reset();
                Workspace.Environment.PerformSelectedPathChanged();

                return sha;
            }
        }

        public DeselectAction(DocumentWorkspace workspace)
            : base(workspace, DeselectAction.StaticName)
        {
        }
    }
}
