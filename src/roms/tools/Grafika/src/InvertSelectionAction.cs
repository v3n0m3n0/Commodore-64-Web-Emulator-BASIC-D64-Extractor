using System;

namespace PaintDotNet
{
    /// <summary>
    /// Summary description for InvertSelectionAction.
    /// </summary>
    public class InvertSelectionAction
        : DocumentAction
    {
        public static string StaticName
        {
            get
            {
                return "Invert Selection";
            }
        }

        public override HistoryAction PerformAction()
        {
            SelectionHistoryAction sha = new SelectionHistoryAction(name, Utility.GetImageResource("Icons.MenuEditInvertSelectionIcon.bmp"), Workspace);

            PdnRegion selectedRegion;

            if (Workspace.Environment.IsSelectionEmpty)
            {
                selectedRegion = new PdnRegion(Workspace.Document.Bounds);
            }
            else
            {
                selectedRegion = Workspace.Environment.CreateSelectedRegion();
            }

            selectedRegion.Xor(Workspace.Document.Bounds);

            PdnGraphicsPath invertedSelection = PdnGraphicsPath.FromRegion(selectedRegion);
            selectedRegion.Dispose();

            Workspace.Environment.SelectedPath = invertedSelection;

            return sha;
        }
 
        public InvertSelectionAction(DocumentWorkspace workspace)
            : base(workspace, StaticName)
        {
        }
    }
}
