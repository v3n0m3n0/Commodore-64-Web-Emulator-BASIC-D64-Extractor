using System;
using System.Collections;
using System.ComponentModel;
using System.Drawing;
using System.Windows.Forms;
using DotNetWidgets;

namespace PaintDotNet
{
    /// <summary>
    /// Summary description for MainToolBar.
    /// </summary>
	public class MainToolBar : System.Windows.Forms.UserControl
	{
		// private ColorDisplayWidget colorDisplayWidget;
		private DotNetWidgets.DotNetToolbar[] dotNetToolbars;
		private ImageList imageList;
		private DotNetWidgets.DotNetToolbar.ButtonClickEventHandler toolClickedDelegate;
		private const int tbWidth = 2; // two buttons per line in the toolbars
		private ToleranceSliderControl  toleranceSlider;
		private PaintDotNet.ColorDisplayWidget colorDisplayWidget;
		public PaintDotNet.ColorArrayWidget ColorArray;
		public System.Windows.Forms.Panel panel1;
		public System.Windows.Forms.Panel panel2;
		public System.Windows.Forms.Panel panel3;
		private System.Windows.Forms.GroupBox groupBox1;
		private System.Windows.Forms.ToolTip tooltipProvider;

		public ColorDisplayWidget ColorDisplayWidget
		{
			get
			{
				return colorDisplayWidget;
			}
		}

		public ToleranceSliderControl ToleranceSlider
		{
			get
			{
				return toleranceSlider;
			}
		}
	
        /// <summary> 
        /// Required designer variable.
        /// </summary>
        // private System.ComponentModel.Container components = null;
		private System.ComponentModel.IContainer components;

        public MainToolBar()
        {
            // This call is required by the Windows.Forms Form Designer.
            InitializeComponent();

            this.toolClickedDelegate = new DotNetWidgets.DotNetToolbar.ButtonClickEventHandler(dotNetToolbar_ButtonClick);
		}

        public class DotNetToolbarButtonItemWithTag 
            : DotNetToolbarButtonItem
        {
            private object tag;
            public object Tag
            {
                get
                {
                    return tag;
                }

                set
                {
                    tag = value;
                }
            }
        }

        public event ToolClickedEventHandler ToolClicked;
        protected virtual void OnToolClicked(Type toolType)
        {
            if (ToolClicked != null)
            {
                ToolClicked(this, new ToolClickedEventArgs(toolType));
            }
        }

        public ColorDisplayWidget ColorDisplay
        {
            get
            {
                return colorDisplayWidget;
            }
        }

        public void SetTools(ToolInfo[] toolInfos, DocumentWorkspace workspace)
        {
            imageList = new ImageList();
            imageList.TransparentColor = Color.FromArgb(192, 192, 192);
            int tbIndex = 0;

            if (dotNetToolbars != null)
            {
                foreach (DotNetToolbar tb in dotNetToolbars)
                {
                    tb.ButtonClick -= this.toolClickedDelegate;
                    this.Controls.Remove(tb);
                }
            }

            dotNetToolbars = new DotNetWidgets.DotNetToolbar[(toolInfos.Length + (tbWidth - 1)) / tbWidth];

            for (int i = 0; i < dotNetToolbars.Length; ++i)
            {
                dotNetToolbars[i] = new DotNetWidgets.DotNetToolbar();
                dotNetToolbars[i].Dock = DockStyle.Top;
                dotNetToolbars[i].ButtonClick += toolClickedDelegate;
                dotNetToolbars[i].DrawGrabHandle = false;
                dotNetToolbars[i].ImageList = imageList;

				// dotNetToolbars[i].Draw3DToolTips = false;
				// dotNetToolbars[i].DrawSeparator = false;
            }

            this.Controls.AddRange(dotNetToolbars);

            foreach (ToolInfo toolInfo in toolInfos)
            {
                int imageIndex = imageList.Images.Add((Image)toolInfo.Image.Clone(), imageList.TransparentColor);
                DotNetToolbarButtonItemWithTag tbb = new DotNetToolbarButtonItemWithTag();
                tbb.ImageIndex = imageIndex;
                tbb.Tag = toolInfo.ToolType;
                tbb.ToolTipText = toolInfo.Name + " (" + toolInfo.HotKey.ToString().ToUpper() + ")";
                dotNetToolbars[dotNetToolbars.Length - (tbIndex / tbWidth) - 1].Buttons.Add(tbb);

                ++tbIndex;
            }
        }

        public void SelectTool(Type toolType)
        {
            foreach (DotNetToolbar dotNetToolbar in dotNetToolbars)
            {
                foreach (DotNetToolbarButtonItemWithTag tbb in dotNetToolbar.Buttons)
                {
                    if ((Type)tbb.Tag == toolType)
                    {
                        dotNetToolbar_ButtonClick(this, new DotNetToolbarItemClickEventArgs(tbb));
                        return;
                    }
                }
            }

            throw new ArgumentException("Tool type not found");
        }

        public int ToolbarsHeight()
        {
            int total = 0;

            foreach (Control c in dotNetToolbars)
            {
                total += c.Height;
            }

            return total + 10 + 14;
        }

        protected override void OnLoad(EventArgs e)
        {
            base.OnLoad (e);
            this.ClientSize = new Size(dotNetToolbars[0].Width, /* ColorArray.Height + colorDisplayWidget.Height + toleranceSlider.Height + */ ToolbarsHeight());
        }

        /// <summary> 
        /// Clean up any resources being used.
        /// </summary>
        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (components != null)
                {
                    components.Dispose();
                    components = null;
                }
            }
            base.Dispose(disposing);
        }

        #region Component Designer generated code
        /// <summary> 
        /// Required method for Designer support - do not modify 
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
			this.components = new System.ComponentModel.Container();
			this.tooltipProvider = new System.Windows.Forms.ToolTip(this.components);
			this.panel1 = new System.Windows.Forms.Panel();
			this.panel2 = new System.Windows.Forms.Panel();
			this.panel3 = new System.Windows.Forms.Panel();
			this.toleranceSlider = new PaintDotNet.ToleranceSliderControl();
			this.colorDisplayWidget = new PaintDotNet.ColorDisplayWidget();
			this.ColorArray = new PaintDotNet.ColorArrayWidget();
			this.groupBox1 = new System.Windows.Forms.GroupBox();
			this.groupBox1.SuspendLayout();
			this.SuspendLayout();
			// 
			// tooltipProvider
			// 
			this.tooltipProvider.AutomaticDelay = 50;
			this.tooltipProvider.AutoPopDelay = 0;
			this.tooltipProvider.InitialDelay = 5;
			this.tooltipProvider.ReshowDelay = 10;
			this.tooltipProvider.ShowAlways = true;
			// 
			// panel1
			// 
			this.panel1.BackColor = System.Drawing.Color.Black;
			this.panel1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.panel1.Location = new System.Drawing.Point(6, 10);
			this.panel1.Name = "panel1";
			this.panel1.Size = new System.Drawing.Size(32, 16);
			this.panel1.TabIndex = 2;
			this.tooltipProvider.SetToolTip(this.panel1, "colormem ($d800) / $d026");
			// 
			// panel2
			// 
			this.panel2.BackColor = System.Drawing.Color.Black;
			this.panel2.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.panel2.Location = new System.Drawing.Point(6, 30);
			this.panel2.Name = "panel2";
			this.panel2.Size = new System.Drawing.Size(32, 16);
			this.panel2.TabIndex = 3;
			this.tooltipProvider.SetToolTip(this.panel2, "charmem low nybble / $d027++");
			// 
			// panel3
			// 
			this.panel3.BackColor = System.Drawing.Color.Black;
			this.panel3.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.panel3.Location = new System.Drawing.Point(6, 50);
			this.panel3.Name = "panel3";
			this.panel3.Size = new System.Drawing.Size(32, 16);
			this.panel3.TabIndex = 4;
			this.tooltipProvider.SetToolTip(this.panel3, "charmem high nybble / $d025");
			// 
			// toleranceSlider
			// 
			this.toleranceSlider.Location = new System.Drawing.Point(0, 288);
			this.toleranceSlider.Name = "toleranceSlider";
			this.toleranceSlider.Size = new System.Drawing.Size(48, 16);
			this.toleranceSlider.TabIndex = 0;
			this.toleranceSlider.Tolerance = 0.02F;
			// 
			// colorDisplayWidget
			// 
			this.colorDisplayWidget.Location = new System.Drawing.Point(50, 2);
			this.colorDisplayWidget.Name = "colorDisplayWidget";
			this.colorDisplayWidget.TabIndex = 1;
			// 
			// ColorArray
			// 
			this.ColorArray.Location = new System.Drawing.Point(50, 48);
			this.ColorArray.Name = "ColorArray";
			this.ColorArray.Size = new System.Drawing.Size(48, 184);
			this.ColorArray.TabIndex = 0;
			// 
			// groupBox1
			// 
			this.groupBox1.Controls.Add(this.panel1);
			this.groupBox1.Controls.Add(this.panel2);
			this.groupBox1.Controls.Add(this.panel3);
			this.groupBox1.Location = new System.Drawing.Point(52, 232);
			this.groupBox1.Name = "groupBox1";
			this.groupBox1.Size = new System.Drawing.Size(44, 72);
			this.groupBox1.TabIndex = 5;
			this.groupBox1.TabStop = false;
			// 
			// MainToolBar
			// 
			this.Controls.Add(this.groupBox1);
			this.Controls.Add(this.ColorArray);
			this.Controls.Add(this.colorDisplayWidget);
			this.Controls.Add(this.toleranceSlider);
			this.Name = "MainToolBar";
			this.Size = new System.Drawing.Size(104, 312);
			this.groupBox1.ResumeLayout(false);
			this.ResumeLayout(false);

		}
        #endregion

        private void dotNetToolbar_ButtonClick(object sender, DotNetWidgets.DotNetToolbarItemClickEventArgs e)
        {
            DotNetToolbarButtonItemWithTag button = (DotNetToolbarButtonItemWithTag)e.Button;

            foreach (DotNetToolbar dotNetToolbar in dotNetToolbars)
            {
                foreach (DotNetToolbarButtonItemWithTag tbb in dotNetToolbar.Buttons)
                {
                    if (tbb != button)
                    {
                        tbb.Pushed = false;
                    }
                }
            }

            button.Pushed = true;
            OnToolClicked((Type)button.Tag);
        }
    }
}

