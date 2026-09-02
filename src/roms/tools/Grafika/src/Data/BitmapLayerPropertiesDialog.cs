using System;
using System.Collections;
using System.ComponentModel;
using System.Drawing;
using System.Windows.Forms;

namespace PaintDotNet
{
    public class BitmapLayerPropertiesDialog : PaintDotNet.LayerPropertiesDialog
    {
        private System.Windows.Forms.GroupBox blendingGroupBox;
		private System.Windows.Forms.GroupBox groupBox2;
		private System.Windows.Forms.ComboBox blendOpComboBox;
        private System.Windows.Forms.NumericUpDown opacityUpDown;
        private System.Windows.Forms.TrackBar opacityTrackBar;
		private System.Windows.Forms.CheckBox indexedcolorCheckBox;
        private System.ComponentModel.IContainer components = null;
		private System.Windows.Forms.Label label2;
		private System.Windows.Forms.Label label3;
		private System.Windows.Forms.ComboBox restrictModeComboBox;
		private System.Windows.Forms.CheckBox fixclashesCheckBox;
		private System.Windows.Forms.Label label4;

        public BitmapLayerPropertiesDialog()
        {
            // This call is required by the Windows Form Designer.
            InitializeComponent();

            // populate the blendOpComboBox with all the blend modes they're allowed to use
            foreach (Type type in UserBlendOps.GetBlendOps())
            {
                blendOpComboBox.Items.Add(UserBlendOps.CreateBlendOp(type));
            }

			foreach (Type type in RestrictModes.GetRestrictModes())
			{
				restrictModeComboBox.Items.Add(RestrictModes.CreateRestrictMode(type));
			}
        }

        protected override void OnLoad(EventArgs e)
        {
            base.OnLoad (e);
        }

        private void SelectOp(UserBlendOp setOp)
        {
            foreach (object op in blendOpComboBox.Items)
            {
                if (op.ToString() == setOp.ToString())
                {
                    blendOpComboBox.SelectedItem = op;
                    break;
                }
            }
        }

		private void SelectMode(RestrictMode setMode)
		{
			foreach (object op in restrictModeComboBox.Items)
			{
				if (op.ToString() == setMode.ToString())
				{
					restrictModeComboBox.SelectedItem = op;
					break;
				}
			}
		}

        protected override void InitDialogFromLayer()
        {
            opacityUpDown.Value = Layer.Opacity;
            SelectOp(((BitmapLayer)Layer).BlendOp);
			SelectMode(((BitmapLayer)Layer).GetRestrictMode);
			base.InitDialogFromLayer ();
			this.fixclashesCheckBox.Checked = ((BitmapLayer)Layer).IsFixClashes;
			this.indexedcolorCheckBox.Checked = ((BitmapLayer)Layer).IsIndexedColor;
			this.restrictModeComboBox.Enabled = indexedcolorCheckBox.Checked;
			this.fixclashesCheckBox.Enabled = indexedcolorCheckBox.Checked;
        }

        protected override void InitLayerFromDialog()
        {
            ((BitmapLayer)Layer).Opacity = (byte)opacityUpDown.Value;

            if (blendOpComboBox.SelectedItem != null)
            {
                ((BitmapLayer)Layer).SetBlendOp((UserBlendOp)blendOpComboBox.SelectedItem);
            }

			if (restrictModeComboBox.SelectedItem != null)
			{
				((BitmapLayer)Layer).SetRestrictMode((RestrictMode)restrictModeComboBox.SelectedItem);
			}

			((BitmapLayer)Layer).IsFixClashes = this.fixclashesCheckBox.Checked;
			((BitmapLayer)Layer).IsIndexedColor = this.indexedcolorCheckBox.Checked;

			base.InitLayerFromDialog();
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

        #region Designer generated code
        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
			this.blendingGroupBox = new System.Windows.Forms.GroupBox();
			this.label3 = new System.Windows.Forms.Label();
			this.blendOpComboBox = new System.Windows.Forms.ComboBox();
			this.opacityUpDown = new System.Windows.Forms.NumericUpDown();
			this.opacityTrackBar = new System.Windows.Forms.TrackBar();
			this.label2 = new System.Windows.Forms.Label();
			this.groupBox2 = new System.Windows.Forms.GroupBox();
			this.fixclashesCheckBox = new System.Windows.Forms.CheckBox();
			this.label4 = new System.Windows.Forms.Label();
			this.restrictModeComboBox = new System.Windows.Forms.ComboBox();
			this.indexedcolorCheckBox = new System.Windows.Forms.CheckBox();
			this.blendingGroupBox.SuspendLayout();
			((System.ComponentModel.ISupportInitialize)(this.opacityUpDown)).BeginInit();
			((System.ComponentModel.ISupportInitialize)(this.opacityTrackBar)).BeginInit();
			this.groupBox2.SuspendLayout();
			this.SuspendLayout();
			// 
			// visibleCheckBox
			// 
			this.visibleCheckBox.Name = "visibleCheckBox";
			// 
			// label1
			// 
			this.label1.Name = "label1";
			// 
			// groupBox1
			// 
			this.groupBox1.Name = "groupBox1";
			// 
			// nameBox
			// 
			this.nameBox.Name = "nameBox";
			// 
			// cancelButton
			// 
			this.cancelButton.Location = new System.Drawing.Point(208, 283);
			this.cancelButton.Name = "cancelButton";
			// 
			// okButton
			// 
			this.okButton.FlatStyle = System.Windows.Forms.FlatStyle.System;
			this.okButton.Location = new System.Drawing.Point(120, 283);
			this.okButton.Name = "okButton";
			// 
			// blendingGroupBox
			// 
			this.blendingGroupBox.Controls.Add(this.label3);
			this.blendingGroupBox.Controls.Add(this.blendOpComboBox);
			this.blendingGroupBox.Controls.Add(this.opacityUpDown);
			this.blendingGroupBox.Controls.Add(this.opacityTrackBar);
			this.blendingGroupBox.Controls.Add(this.label2);
			this.blendingGroupBox.FlatStyle = System.Windows.Forms.FlatStyle.System;
			this.blendingGroupBox.Location = new System.Drawing.Point(8, 192);
			this.blendingGroupBox.Name = "blendingGroupBox";
			this.blendingGroupBox.Size = new System.Drawing.Size(272, 80);
			this.blendingGroupBox.TabIndex = 7;
			this.blendingGroupBox.TabStop = false;
			this.blendingGroupBox.Text = "Blending";
			// 
			// label3
			// 
			this.label3.Location = new System.Drawing.Point(14, 20);
			this.label3.Name = "label3";
			this.label3.Size = new System.Drawing.Size(40, 23);
			this.label3.TabIndex = 4;
			this.label3.Text = "Mode:";
			// 
			// blendOpComboBox
			// 
			this.blendOpComboBox.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
			this.blendOpComboBox.Location = new System.Drawing.Point(56, 16);
			this.blendOpComboBox.Name = "blendOpComboBox";
			this.blendOpComboBox.Size = new System.Drawing.Size(200, 21);
			this.blendOpComboBox.TabIndex = 4;
			this.blendOpComboBox.SelectedIndexChanged += new System.EventHandler(this.blendOpComboBox_SelectedIndexChanged);
			// 
			// opacityUpDown
			// 
			this.opacityUpDown.Location = new System.Drawing.Point(71, 46);
			this.opacityUpDown.Maximum = new System.Decimal(new int[] {
																		  255,
																		  0,
																		  0,
																		  0});
			this.opacityUpDown.Name = "opacityUpDown";
			this.opacityUpDown.Size = new System.Drawing.Size(56, 20);
			this.opacityUpDown.TabIndex = 5;
			this.opacityUpDown.TextAlign = System.Windows.Forms.HorizontalAlignment.Right;
			this.opacityUpDown.Enter += new System.EventHandler(this.opacityUpDown_Enter);
			this.opacityUpDown.KeyUp += new System.Windows.Forms.KeyEventHandler(this.opacityUpDown_KeyUp);
			this.opacityUpDown.ValueChanged += new System.EventHandler(this.opacityUpDown_ValueChanged);
			this.opacityUpDown.Leave += new System.EventHandler(this.opacityUpDown_Leave);
			// 
			// opacityTrackBar
			// 
			this.opacityTrackBar.AutoSize = false;
			this.opacityTrackBar.LargeChange = 32;
			this.opacityTrackBar.Location = new System.Drawing.Point(136, 45);
			this.opacityTrackBar.Maximum = 255;
			this.opacityTrackBar.Name = "opacityTrackBar";
			this.opacityTrackBar.Size = new System.Drawing.Size(128, 24);
			this.opacityTrackBar.TabIndex = 6;
			this.opacityTrackBar.TickStyle = System.Windows.Forms.TickStyle.None;
			this.opacityTrackBar.ValueChanged += new System.EventHandler(this.opacityTrackBar_ValueChanged);
			// 
			// label2
			// 
			this.label2.Location = new System.Drawing.Point(14, 48);
			this.label2.Name = "label2";
			this.label2.Size = new System.Drawing.Size(48, 16);
			this.label2.TabIndex = 0;
			this.label2.Text = "Opacity:";
			// 
			// groupBox2
			// 
			this.groupBox2.Controls.Add(this.fixclashesCheckBox);
			this.groupBox2.Controls.Add(this.label4);
			this.groupBox2.Controls.Add(this.restrictModeComboBox);
			this.groupBox2.Controls.Add(this.indexedcolorCheckBox);
			this.groupBox2.FlatStyle = System.Windows.Forms.FlatStyle.System;
			this.groupBox2.Location = new System.Drawing.Point(9, 80);
			this.groupBox2.Name = "groupBox2";
			this.groupBox2.Size = new System.Drawing.Size(272, 104);
			this.groupBox2.TabIndex = 9;
			this.groupBox2.TabStop = false;
			this.groupBox2.Text = "Bitmap Layer";
			// 
			// fixclashesCheckBox
			// 
			this.fixclashesCheckBox.FlatStyle = System.Windows.Forms.FlatStyle.System;
			this.fixclashesCheckBox.Location = new System.Drawing.Point(16, 48);
			this.fixclashesCheckBox.Name = "fixclashesCheckBox";
			this.fixclashesCheckBox.Size = new System.Drawing.Size(240, 16);
			this.fixclashesCheckBox.TabIndex = 7;
			this.fixclashesCheckBox.Text = "Autofix clashes";
			this.fixclashesCheckBox.CheckedChanged += new System.EventHandler(this.fixclashesCheckBox_CheckedChanged);
			// 
			// label4
			// 
			this.label4.Location = new System.Drawing.Point(16, 76);
			this.label4.Name = "label4";
			this.label4.Size = new System.Drawing.Size(40, 23);
			this.label4.TabIndex = 6;
			this.label4.Text = "Mode:";
			// 
			// restrictModeComboBox
			// 
			this.restrictModeComboBox.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
			this.restrictModeComboBox.ItemHeight = 13;
			this.restrictModeComboBox.Location = new System.Drawing.Point(56, 72);
			this.restrictModeComboBox.MaxDropDownItems = 12;
			this.restrictModeComboBox.Name = "restrictModeComboBox";
			this.restrictModeComboBox.Size = new System.Drawing.Size(200, 21);
			this.restrictModeComboBox.TabIndex = 5;
			this.restrictModeComboBox.SelectedIndexChanged += new System.EventHandler(this.restrictModeComboBox_SelectedIndexChanged);
			// 
			// indexedcolorCheckBox
			// 
			this.indexedcolorCheckBox.FlatStyle = System.Windows.Forms.FlatStyle.System;
			this.indexedcolorCheckBox.Location = new System.Drawing.Point(16, 24);
			this.indexedcolorCheckBox.Name = "indexedcolorCheckBox";
			this.indexedcolorCheckBox.Size = new System.Drawing.Size(240, 16);
			this.indexedcolorCheckBox.TabIndex = 4;
			this.indexedcolorCheckBox.Text = "Indexed Color";
			this.indexedcolorCheckBox.CheckedChanged += new System.EventHandler(this.indexedcolorCheckBox_CheckedChanged);
			// 
			// BitmapLayerPropertiesDialog
			// 
			this.AutoScaleBaseSize = new System.Drawing.Size(5, 13);
			this.ClientSize = new System.Drawing.Size(290, 312);
			this.Controls.Add(this.groupBox2);
			this.Controls.Add(this.blendingGroupBox);
			this.Location = new System.Drawing.Point(0, 0);
			this.Name = "BitmapLayerPropertiesDialog";
			this.Controls.SetChildIndex(this.blendingGroupBox, 0);
			this.Controls.SetChildIndex(this.groupBox1, 0);
			this.Controls.SetChildIndex(this.cancelButton, 0);
			this.Controls.SetChildIndex(this.okButton, 0);
			this.Controls.SetChildIndex(this.groupBox2, 0);
			this.blendingGroupBox.ResumeLayout(false);
			((System.ComponentModel.ISupportInitialize)(this.opacityUpDown)).EndInit();
			((System.ComponentModel.ISupportInitialize)(this.opacityTrackBar)).EndInit();
			this.groupBox2.ResumeLayout(false);
			this.ResumeLayout(false);

		}
        #endregion

        private void ChangeLayerOpacity()
        {
            if (((BitmapLayer)Layer).Opacity != (byte)opacityUpDown.Value)
            {
                Layer.PushSuppressPropertyChanged();
                ((BitmapLayer)Layer).Opacity = (byte)opacityTrackBar.Value;
                Layer.PopSuppressPropertyChanged();
            }
        }

        private void opacityUpDown_ValueChanged(object sender, System.EventArgs e)
        {
            if (opacityTrackBar.Value != (int)opacityUpDown.Value)
            {
                using (new WaitCursorChanger(this))
                {
                    opacityTrackBar.Value = (int)opacityUpDown.Value;
                    ChangeLayerOpacity();
                }
            }
        }

        private void opacityUpDown_Enter(object sender, System.EventArgs e)
        {
            opacityUpDown.Select(0, opacityUpDown.Text.Length);
        }

        private void opacityUpDown_KeyUp(object sender, System.Windows.Forms.KeyEventArgs e)
        {
        }

        private void opacityTrackBar_ValueChanged(object sender, System.EventArgs e)
        {
            if (opacityUpDown.Value != (decimal)opacityTrackBar.Value)
            {
                using (new WaitCursorChanger(this))
                {
                    opacityUpDown.Value = (decimal)opacityTrackBar.Value;
                    ChangeLayerOpacity();
                }
            }
        }

        private void opacityUpDown_Leave(object sender, System.EventArgs e)
        {
            opacityUpDown_ValueChanged(sender, e);
        }

        private void blendOpComboBox_SelectedIndexChanged(object sender, System.EventArgs e)
        {
            using (new WaitCursorChanger(this))
            {
                Layer.PushSuppressPropertyChanged();

                if (blendOpComboBox.SelectedItem != null)
                {
                    ((BitmapLayer)Layer).SetBlendOp((UserBlendOp)blendOpComboBox.SelectedItem);
                }

                Layer.PopSuppressPropertyChanged();
            }
        }

		private void restrictModeComboBox_SelectedIndexChanged(object sender, System.EventArgs e)
		{
			using (new WaitCursorChanger(this))
			{
				Layer.PushSuppressPropertyChanged();

				if (restrictModeComboBox.SelectedItem != null)
				{
					((BitmapLayer)Layer).SetRestrictMode((RestrictMode)restrictModeComboBox.SelectedItem);
				}

				Layer.PopSuppressPropertyChanged();
			}
		}
	
		private void fixclashesCheckBox_CheckedChanged(object sender, System.EventArgs e)
		{
			Layer.PushSuppressPropertyChanged();
			((BitmapLayer)Layer).IsFixClashes = fixclashesCheckBox.Checked;
			Layer.PopSuppressPropertyChanged();
		}	

		private void indexedcolorCheckBox_CheckedChanged(object sender, System.EventArgs e)
		{
			Layer.PushSuppressPropertyChanged();
			((BitmapLayer)Layer).IsIndexedColor = indexedcolorCheckBox.Checked;
			this.restrictModeComboBox.Enabled = indexedcolorCheckBox.Checked;
			this.fixclashesCheckBox.Enabled = indexedcolorCheckBox.Checked;
			Layer.PopSuppressPropertyChanged();
		}	
	}
}