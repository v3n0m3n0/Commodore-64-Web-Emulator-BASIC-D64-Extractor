using System;

namespace PaintDotNet
{
	/// <summary>
	/// Couples a WorkspaceAction with some parameters.
	/// </summary>
	public class InvokeWorkspaceAction
        : WorkspaceAction
	{
        private Type workspaceAction;

        public override void PerformAction(params object[] parameters)
        {
            Workspace.PerformAction(workspaceAction, parameters);
        }

		public InvokeWorkspaceAction(DocumentWorkspace workspace, Type workspaceAction, params object[] parameters)
            : base(workspace)
		{
            this.workspaceAction = workspaceAction;
		}
	}
}
