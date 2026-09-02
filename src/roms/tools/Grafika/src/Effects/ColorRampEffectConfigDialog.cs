using System;
using System.Collections;
using System.ComponentModel;
using System.Drawing;
using System.Windows.Forms;

namespace PaintDotNet.Effects
{
	public class ColorRampEffectConfigDialog 
        : EffectConfigDialog
	{
        private System.Windows.Forms.Button cancelButton;
        private System.Windows.Forms.Button okButton;
		private System.Windows.Forms.TrackBar contrastTrackBar;
		private System.Windows.Forms.NumericUpDown contrastUpDown;
		private System.Windows.Forms.Label label2;
		private System.Windows.Forms.Label label3;
		private System.Windows.Forms.TrackBar brightnessTrackBar;
		private System.Windows.Forms.NumericUpDown brightnessUpDown;
		private System.Windows.Forms.CheckBox doublepixelCheckBox;
		private System.Windows.Forms.CheckBox colorizeCheckBox;
		private System.Windows.Forms.TrackBar saturationTrackBar;
		private System.Windows.Forms.NumericUpDown saturationUpDown;
		private System.Windows.Forms.Label label1;
		private System.Windows.Forms.Label label4;
		private System.Windows.Forms.TrackBar hueTrackBar;
		private System.Windows.Forms.NumericUpDown hueUpDown;
		private System.Windows.Forms.Button resetButton;
		private System.Windows.Forms.CheckBox preserveCheckBox;
		private System.Windows.Forms.Label label7;
		private System.Windows.Forms.Label label5;
		private System.Windows.Forms.ComboBox brightnessDitherModeComboBox;
		private System.Windows.Forms.ComboBox hueDitherModeComboBox;
		private System.Windows.Forms.Label label6;
		private System.Windows.Forms.ComboBox saturationDitherModeComboBox;
		private System.Windows.Forms.CheckBox previewCheckBox;
		private System.ComponentModel.IContainer components = null;

		public ColorRampEffectConfigDialog()
		{
			// This call is required by the Windows Form Designer.
			InitializeComponent();

			// TODO: Add any initialization after the InitializeComponent call
			theEffectToken = new ColorRampEffectConfigToken
			(
				true,
				0, 0, 0, 0, 0,
				true, false, false,
				new DitherModes.Checker3OddDitherMode(),
				new DitherModes.Horizontal1OddDitherMode(),
				new DitherModes.Horizontal1OddDitherMode()
			);

			foreach (Type type in DitherModes.GetDitherModes())
			{
				brightnessDitherModeComboBox.Items.Add(DitherModes.CreateDitherMode(type));
				hueDitherModeComboBox.Items.Add(DitherModes.CreateDitherMode(type));
				saturationDitherModeComboBox.Items.Add(DitherModes.CreateDitherMode(type));
			}
			
			InitDialogFromToken();
        }

		private void SelectBrightnessDitherMode(DitherMode setMode)
		{
			foreach (object op in brightnessDitherModeComboBox.Items)
			{
				if (op.ToString() == setMode.ToString())
				{
					brightnessDitherModeComboBox.SelectedItem = op;
					break;
				}
			}
		}

		private void SelectHueDitherMode(DitherMode setMode)
		{
			foreach (object op in hueDitherModeComboBox.Items)
			{
				if (op.ToString() == setMode.ToString())
				{
					hueDitherModeComboBox.SelectedItem = op;
					break;
				}
			}
		}
		
		private void SelectSaturationDitherMode(DitherMode setMode)
		{
			foreach (object op in saturationDitherModeComboBox.Items)
			{
				if (op.ToString() == setMode.ToString())
				{
					saturationDitherModeComboBox.SelectedItem = op;
					break;
				}
			}
		}
		
		protected override void InitTokenFromDialog()
        {
			((ColorRampEffectConfigToken)EffectToken).Hue = hueTrackBar.Value;
			((ColorRampEffectConfigToken)EffectToken).Saturation = saturationTrackBar.Value;
			((ColorRampEffectConfigToken)EffectToken).Brightness = brightnessTrackBar.Value;
			((ColorRampEffectConfigToken)EffectToken).Contrast = contrastTrackBar.Value;
			((ColorRampEffectConfigToken)EffectToken).Doublepixel = doublepixelCheckBox.Checked;
			((ColorRampEffectConfigToken)EffectToken).Colorize = colorizeCheckBox.Checked;
			((ColorRampEffectConfigToken)EffectToken).Preview = previewCheckBox.Checked;
			((ColorRampEffectConfigToken)EffectToken).Preserve = preserveCheckBox.Checked;
			if (brightnessDitherModeComboBox.SelectedItem != null)
			{
				((ColorRampEffectConfigToken)EffectToken).SetBrightnessDitherMode((DitherMode)brightnessDitherModeComboBox.SelectedItem);
			}
			if (hueDitherModeComboBox.SelectedItem != null)
			{
				((ColorRampEffectConfigToken)EffectToken).SetHueDitherMode((DitherMode)hueDitherModeComboBox.SelectedItem);
			}
			if (saturationDitherModeComboBox.SelectedItem != null)
			{
				((ColorRampEffectConfigToken)EffectToken).SetSaturationDitherMode((DitherMode)saturationDitherModeComboBox.SelectedItem);
			}
			OnEffectTokenChanged();
        }

        protected override void InitDialogFromToken(EffectConfigToken effectToken)
        {
			this.hueTrackBar.Value = ((ColorRampEffectConfigToken)EffectToken).Hue;
			this.saturationTrackBar.Value = ((ColorRampEffectConfigToken)EffectToken).Saturation;
			this.brightnessTrackBar.Value = ((ColorRampEffectConfigToken)EffectToken).Brightness;
			this.contrastTrackBar.Value = ((ColorRampEffectConfigToken)EffectToken).Contrast;

			this.hueTrackBar.Value = 0;
			this.saturationTrackBar.Value = 0;
			this.brightnessTrackBar.Value = 0;
			this.contrastTrackBar.Value = 0;

			SelectBrightnessDitherMode(((ColorRampEffectConfigToken)EffectToken).GetBrightnessDitherMode);
			SelectHueDitherMode(((ColorRampEffectConfigToken)EffectToken).GetHueDitherMode);
			SelectSaturationDitherMode(((ColorRampEffectConfigToken)EffectToken).GetSaturationDitherMode);

			this.doublepixelCheckBox.Checked = ((ColorRampEffectConfigToken)EffectToken).Doublepixel;
			this.preserveCheckBox.Checked = true;
			this.colorizeCheckBox.Checked = false;
			this.previewCheckBox.Checked = true;
		}

		/// <summary>
		/// Clean up any resources being used.
		/// </summary>
		protected override void Dispose( bool disposing )
		{
			if( disposing )
			{
				if (components != null) 
				{
					components.Dispose();
				}
			}
			base.Dispose( disposing );
		}

		#region Designer generated code
		/// <summary>
		/// Required method for Designer support - do not modify
		/// the contents of this method with the code editor.
		/// </summary>
		private void InitializeComponent()
		{
			this.cancelButton = new System.Windows.Forms.Button();
			this.okButton = new System.Windows.Forms.Button();
			this.contrastTrackBar = new System.Windows.Forms.TrackBar();
			this.contrastUpDown = new System.Windows.Forms.NumericUpDown();
			this.label2 = new System.Windows.Forms.Label();
			this.label3 = new System.Windows.Forms.Label();
			this.brightnessTrackBar = new System.Windows.Forms.TrackBar();
			this.brightnessUpDown = new System.Windows.Forms.NumericUpDown();
			this.doublepixelCheckBox = new System.Windows.Forms.CheckBox();
			this.colorizeCheckBox = new System.Windows.Forms.CheckBox();
			this.saturationTrackBar = new System.Windows.Forms.TrackBar();
			this.saturationUpDown = new System.Windows.Forms.NumericUpDown();
			this.label1 = new System.Windows.Forms.Label();
			this.label4 = new System.Windows.Forms.Label();
			this.hueTrackBar = new System.Windows.Forms.TrackBar();
			this.hueUpDown = new System.Windows.Forms.NumericUpDown();
			this.resetButton = new System.Windows.Forms.Button();
			this.preserveCheckBox = new System.Windows.Forms.CheckBox();
			this.brightnessDitherModeComboBox = new System.Windows.Forms.ComboBox();
			this.label7 = new System.Windows.Forms.Label();
			this.label5 = new System.Windows.Forms.Label();
			this.hueDitherModeComboBox = new System.Windows.Forms.ComboBox();
			this.label6 = new System.Windows.Forms.Label();
			this.saturationDitherModeComboBox = new System.Windows.Forms.ComboBox();
			this.previewCheckBox = new System.Windows.Forms.CheckBox();
			((System.ComponentModel.ISupportInitialize)(this.contrastTrackBar)).BeginInit();
			((System.ComponentModel.ISupportInitialize)(this.contrastUpDown)).BeginInit();
			((System.ComponentModel.ISupportInitialize)(this.brightnessTrackBar)).BeginInit();
			((System.ComponentModel.ISupportInitialize)(this.brightnessUpDown)).BeginInit();
			((System.ComponentModel.ISupportInitialize)(this.saturationTrackBar)).BeginInit();
			((System.ComponentModel.ISupportInitialize)(this.saturationUpDown)).BeginInit();
			((System.ComponentModel.ISupportInitialize)(this.hueTrackBar)).BeginInit();
			((System.ComponentModel.ISupportInitialize)(this.hueUpDown)).BeginInit();
			this.SuspendLayout();
			// 
			// cancelButton
			// 
			this.cancelButton.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
			this.cancelButton.DialogResult = System.Windows.Forms.DialogResult.Cancel;
			this.cancelButton.FlatStyle = System.Windows.Forms.FlatStyle.System;
			this.cancelButton.Location = new System.Drawing.Point(256, 281);
			this.cancelButton.Name = "cancelButton";
			this.cancelButton.TabIndex = 5;
			this.cancelButton.Text = "Cancel";
			this.cancelButton.Click += new System.EventHandler(this.cancelButton_Click);
			// 
			// okButton
			// 
			this.okButton.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
			this.okButton.FlatStyle = System.Windows.Forms.FlatStyle.System;
			this.okButton.Location = new System.Drawing.Point(168, 281);
			this.okButton.Name = "okButton";
			this.okButton.TabIndex = 4;
			this.okButton.Text = "OK";
			this.okButton.Click += new System.EventHandler(this.okButton_Click);
			// 
			// contrastTrackBar
			// 
			this.contrastTrackBar.AutoSize = false;
			this.contrastTrackBar.Location = new System.Drawing.Point(8, 96);
			this.contrastTrackBar.Maximum = 200;
			this.contrastTrackBar.Minimum = -200;
			this.contrastTrackBar.Name = "contrastTrackBar";
			this.contrastTrackBar.Size = new System.Drawing.Size(168, 24);
			this.contrastTrackBar.TabIndex = 14;
			this.contrastTrackBar.TickFrequency = 200;
			this.contrastTrackBar.TickStyle = System.Windows.Forms.TickStyle.TopLeft;
			this.contrastTrackBar.ValueChanged += new System.EventHandler(this.contrastTrackBar_ValueChanged);
			// 
			// contrastUpDown
			// 
			this.contrastUpDown.Location = new System.Drawing.Point(112, 72);
			this.contrastUpDown.Maximum = new System.Decimal(new int[] {
																		   200,
																		   0,
																		   0,
																		   0});
			this.contrastUpDown.Minimum = new System.Decimal(new int[] {
																		   200,
																		   0,
																		   0,
																		   -2147483648});
			this.contrastUpDown.Name = "contrastUpDown";
			this.contrastUpDown.Size = new System.Drawing.Size(56, 20);
			this.contrastUpDown.TabIndex = 13;
			this.contrastUpDown.TextAlign = System.Windows.Forms.HorizontalAlignment.Right;
			this.contrastUpDown.ValueChanged += new System.EventHandler(this.contrastUpDown_ValueChanged);
			this.contrastUpDown.Leave += new System.EventHandler(this.contrastUpDown_Leave);
			// 
			// label2
			// 
			this.label2.Location = new System.Drawing.Point(16, 72);
			this.label2.Name = "label2";
			this.label2.Size = new System.Drawing.Size(64, 23);
			this.label2.TabIndex = 12;
			this.label2.Text = "Contrast";
			// 
			// label3
			// 
			this.label3.Location = new System.Drawing.Point(16, 16);
			this.label3.Name = "label3";
			this.label3.Size = new System.Drawing.Size(64, 23);
			this.label3.TabIndex = 9;
			this.label3.Text = "Brightness";
			// 
			// brightnessTrackBar
			// 
			this.brightnessTrackBar.AutoSize = false;
			this.brightnessTrackBar.Location = new System.Drawing.Point(8, 40);
			this.brightnessTrackBar.Maximum = 200;
			this.brightnessTrackBar.Minimum = -200;
			this.brightnessTrackBar.Name = "brightnessTrackBar";
			this.brightnessTrackBar.Size = new System.Drawing.Size(168, 24);
			this.brightnessTrackBar.TabIndex = 11;
			this.brightnessTrackBar.TickFrequency = 200;
			this.brightnessTrackBar.TickStyle = System.Windows.Forms.TickStyle.TopLeft;
			this.brightnessTrackBar.ValueChanged += new System.EventHandler(this.brightnessTrackBar_ValueChanged);
			// 
			// brightnessUpDown
			// 
			this.brightnessUpDown.Location = new System.Drawing.Point(112, 16);
			this.brightnessUpDown.Maximum = new System.Decimal(new int[] {
																			 200,
																			 0,
																			 0,
																			 0});
			this.brightnessUpDown.Minimum = new System.Decimal(new int[] {
																			 200,
																			 0,
																			 0,
																			 -2147483648});
			this.brightnessUpDown.Name = "brightnessUpDown";
			this.brightnessUpDown.Size = new System.Drawing.Size(56, 20);
			this.brightnessUpDown.TabIndex = 10;
			this.brightnessUpDown.TextAlign = System.Windows.Forms.HorizontalAlignment.Right;
			this.brightnessUpDown.ValueChanged += new System.EventHandler(this.brightnessUpDown_ValueChanged);
			this.brightnessUpDown.Leave += new System.EventHandler(this.brightnessUpDown_Leave);
			// 
			// doublepixelCheckBox
			// 
			this.doublepixelCheckBox.Checked = true;
			this.doublepixelCheckBox.CheckState = System.Windows.Forms.CheckState.Checked;
			this.doublepixelCheckBox.FlatStyle = System.Windows.Forms.FlatStyle.System;
			this.doublepixelCheckBox.Location = new System.Drawing.Point(184, 176);
			this.doublepixelCheckBox.Name = "doublepixelCheckBox";
			this.doublepixelCheckBox.Size = new System.Drawing.Size(88, 16);
			this.doublepixelCheckBox.TabIndex = 16;
			this.doublepixelCheckBox.Text = "Double Pixel";
			this.doublepixelCheckBox.CheckedChanged += new System.EventHandler(this.doublepixelCheckBox_CheckedChanged);
			// 
			// colorizeCheckBox
			// 
			this.colorizeCheckBox.FlatStyle = System.Windows.Forms.FlatStyle.System;
			this.colorizeCheckBox.Location = new System.Drawing.Point(184, 200);
			this.colorizeCheckBox.Name = "colorizeCheckBox";
			this.colorizeCheckBox.Size = new System.Drawing.Size(64, 16);
			this.colorizeCheckBox.TabIndex = 24;
			this.colorizeCheckBox.Text = "Colorize";
			this.colorizeCheckBox.CheckedChanged += new System.EventHandler(this.colorizeCheckBox_CheckedChanged);
			// 
			// saturationTrackBar
			// 
			this.saturationTrackBar.AutoSize = false;
			this.saturationTrackBar.Location = new System.Drawing.Point(8, 208);
			this.saturationTrackBar.Maximum = 100;
			this.saturationTrackBar.Minimum = -100;
			this.saturationTrackBar.Name = "saturationTrackBar";
			this.saturationTrackBar.Size = new System.Drawing.Size(168, 24);
			this.saturationTrackBar.TabIndex = 23;
			this.saturationTrackBar.TickFrequency = 100;
			this.saturationTrackBar.TickStyle = System.Windows.Forms.TickStyle.TopLeft;
			this.saturationTrackBar.ValueChanged += new System.EventHandler(this.saturationTrackBar_ValueChanged);
			// 
			// saturationUpDown
			// 
			this.saturationUpDown.Location = new System.Drawing.Point(112, 184);
			this.saturationUpDown.Minimum = new System.Decimal(new int[] {
																			 100,
																			 0,
																			 0,
																			 -2147483648});
			this.saturationUpDown.Name = "saturationUpDown";
			this.saturationUpDown.Size = new System.Drawing.Size(56, 20);
			this.saturationUpDown.TabIndex = 22;
			this.saturationUpDown.TextAlign = System.Windows.Forms.HorizontalAlignment.Right;
			this.saturationUpDown.ValueChanged += new System.EventHandler(this.saturationUpDown_ValueChanged);
			this.saturationUpDown.Leave += new System.EventHandler(this.saturationUpDown_Leave);
			// 
			// label1
			// 
			this.label1.Location = new System.Drawing.Point(16, 184);
			this.label1.Name = "label1";
			this.label1.Size = new System.Drawing.Size(64, 23);
			this.label1.TabIndex = 21;
			this.label1.Text = "Saturation";
			// 
			// label4
			// 
			this.label4.Location = new System.Drawing.Point(16, 128);
			this.label4.Name = "label4";
			this.label4.Size = new System.Drawing.Size(64, 23);
			this.label4.TabIndex = 18;
			this.label4.Text = "Hue";
			// 
			// hueTrackBar
			// 
			this.hueTrackBar.AutoSize = false;
			this.hueTrackBar.Location = new System.Drawing.Point(8, 152);
			this.hueTrackBar.Maximum = 180;
			this.hueTrackBar.Minimum = -180;
			this.hueTrackBar.Name = "hueTrackBar";
			this.hueTrackBar.Size = new System.Drawing.Size(168, 24);
			this.hueTrackBar.TabIndex = 20;
			this.hueTrackBar.TickFrequency = 180;
			this.hueTrackBar.TickStyle = System.Windows.Forms.TickStyle.TopLeft;
			this.hueTrackBar.ValueChanged += new System.EventHandler(this.hueTrackBar_ValueChanged);
			// 
			// hueUpDown
			// 
			this.hueUpDown.ImeMode = System.Windows.Forms.ImeMode.NoControl;
			this.hueUpDown.Location = new System.Drawing.Point(112, 128);
			this.hueUpDown.Maximum = new System.Decimal(new int[] {
																	  180,
																	  0,
																	  0,
																	  0});
			this.hueUpDown.Minimum = new System.Decimal(new int[] {
																	  180,
																	  0,
																	  0,
																	  -2147483648});
			this.hueUpDown.Name = "hueUpDown";
			this.hueUpDown.Size = new System.Drawing.Size(56, 20);
			this.hueUpDown.TabIndex = 19;
			this.hueUpDown.TextAlign = System.Windows.Forms.HorizontalAlignment.Right;
			this.hueUpDown.ValueChanged += new System.EventHandler(this.hueUpDown_ValueChanged);
			this.hueUpDown.Leave += new System.EventHandler(this.hueUpDown_Leave);
			// 
			// resetButton
			// 
			this.resetButton.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Left)));
			this.resetButton.FlatStyle = System.Windows.Forms.FlatStyle.System;
			this.resetButton.Location = new System.Drawing.Point(16, 282);
			this.resetButton.Name = "resetButton";
			this.resetButton.TabIndex = 25;
			this.resetButton.Text = "Reset";
			this.resetButton.Click += new System.EventHandler(this.resetButton_Click);
			// 
			// preserveCheckBox
			// 
			this.preserveCheckBox.Checked = true;
			this.preserveCheckBox.CheckState = System.Windows.Forms.CheckState.Checked;
			this.preserveCheckBox.FlatStyle = System.Windows.Forms.FlatStyle.System;
			this.preserveCheckBox.Location = new System.Drawing.Point(184, 224);
			this.preserveCheckBox.Name = "preserveCheckBox";
			this.preserveCheckBox.Size = new System.Drawing.Size(136, 16);
			this.preserveCheckBox.TabIndex = 26;
			this.preserveCheckBox.Text = "Preserve exact colours";
			this.preserveCheckBox.CheckedChanged += new System.EventHandler(this.preserveCheckBox_CheckedChanged);
			// 
			// brightnessDitherModeComboBox
			// 
			this.brightnessDitherModeComboBox.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
			this.brightnessDitherModeComboBox.Location = new System.Drawing.Point(184, 32);
			this.brightnessDitherModeComboBox.Name = "brightnessDitherModeComboBox";
			this.brightnessDitherModeComboBox.Size = new System.Drawing.Size(152, 21);
			this.brightnessDitherModeComboBox.TabIndex = 34;
			this.brightnessDitherModeComboBox.SelectedIndexChanged += new System.EventHandler(this.brightnessDitherModeComboBox_SelectedIndexChanged);
			// 
			// label7
			// 
			this.label7.Location = new System.Drawing.Point(184, 8);
			this.label7.Name = "label7";
			this.label7.Size = new System.Drawing.Size(96, 23);
			this.label7.TabIndex = 35;
			this.label7.Text = "Brightness Dither";
			// 
			// label5
			// 
			this.label5.Location = new System.Drawing.Point(184, 64);
			this.label5.Name = "label5";
			this.label5.Size = new System.Drawing.Size(96, 23);
			this.label5.TabIndex = 37;
			this.label5.Text = "Hue Dither";
			// 
			// hueDitherModeComboBox
			// 
			this.hueDitherModeComboBox.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
			this.hueDitherModeComboBox.Location = new System.Drawing.Point(184, 88);
			this.hueDitherModeComboBox.Name = "hueDitherModeComboBox";
			this.hueDitherModeComboBox.Size = new System.Drawing.Size(152, 21);
			this.hueDitherModeComboBox.TabIndex = 36;
			this.hueDitherModeComboBox.SelectedIndexChanged += new System.EventHandler(this.hueDitherModeComboBox_SelectedIndexChanged);
			// 
			// label6
			// 
			this.label6.Location = new System.Drawing.Point(184, 120);
			this.label6.Name = "label6";
			this.label6.Size = new System.Drawing.Size(96, 23);
			this.label6.TabIndex = 39;
			this.label6.Text = "Saturation Dither";
			// 
			// saturationDitherModeComboBox
			// 
			this.saturationDitherModeComboBox.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
			this.saturationDitherModeComboBox.Location = new System.Drawing.Point(184, 144);
			this.saturationDitherModeComboBox.Name = "saturationDitherModeComboBox";
			this.saturationDitherModeComboBox.Size = new System.Drawing.Size(152, 21);
			this.saturationDitherModeComboBox.TabIndex = 38;
			this.saturationDitherModeComboBox.SelectedIndexChanged += new System.EventHandler(this.saturationDitherModeComboBox_SelectedIndexChanged);
			// 
			// previewCheckBox
			// 
			this.previewCheckBox.FlatStyle = System.Windows.Forms.FlatStyle.System;
			this.previewCheckBox.Location = new System.Drawing.Point(16, 248);
			this.previewCheckBox.Name = "previewCheckBox";
			this.previewCheckBox.Size = new System.Drawing.Size(64, 16);
			this.previewCheckBox.TabIndex = 40;
			this.previewCheckBox.Text = "Preview";
			this.previewCheckBox.CheckedChanged += new System.EventHandler(this.previewCheckBox_CheckedChanged);
			// 
			// ColorRampEffectConfigDialog
			// 
			this.AutoScaleBaseSize = new System.Drawing.Size(5, 13);
			this.ClientSize = new System.Drawing.Size(346, 314);
			this.ControlBox = false;
			this.Controls.Add(this.previewCheckBox);
			this.Controls.Add(this.label6);
			this.Controls.Add(this.saturationDitherModeComboBox);
			this.Controls.Add(this.label5);
			this.Controls.Add(this.hueDitherModeComboBox);
			this.Controls.Add(this.label7);
			this.Controls.Add(this.brightnessDitherModeComboBox);
			this.Controls.Add(this.preserveCheckBox);
			this.Controls.Add(this.resetButton);
			this.Controls.Add(this.colorizeCheckBox);
			this.Controls.Add(this.saturationTrackBar);
			this.Controls.Add(this.saturationUpDown);
			this.Controls.Add(this.label1);
			this.Controls.Add(this.label4);
			this.Controls.Add(this.hueTrackBar);
			this.Controls.Add(this.hueUpDown);
			this.Controls.Add(this.doublepixelCheckBox);
			this.Controls.Add(this.contrastTrackBar);
			this.Controls.Add(this.contrastUpDown);
			this.Controls.Add(this.label2);
			this.Controls.Add(this.label3);
			this.Controls.Add(this.brightnessTrackBar);
			this.Controls.Add(this.brightnessUpDown);
			this.Controls.Add(this.okButton);
			this.Controls.Add(this.cancelButton);
			this.Location = new System.Drawing.Point(0, 0);
			this.Name = "ColorRampEffectConfigDialog";
			this.Text = "C64 ColorRamp";
			this.Controls.SetChildIndex(this.cancelButton, 0);
			this.Controls.SetChildIndex(this.okButton, 0);
			this.Controls.SetChildIndex(this.brightnessUpDown, 0);
			this.Controls.SetChildIndex(this.brightnessTrackBar, 0);
			this.Controls.SetChildIndex(this.label3, 0);
			this.Controls.SetChildIndex(this.label2, 0);
			this.Controls.SetChildIndex(this.contrastUpDown, 0);
			this.Controls.SetChildIndex(this.contrastTrackBar, 0);
			this.Controls.SetChildIndex(this.doublepixelCheckBox, 0);
			this.Controls.SetChildIndex(this.hueUpDown, 0);
			this.Controls.SetChildIndex(this.hueTrackBar, 0);
			this.Controls.SetChildIndex(this.label4, 0);
			this.Controls.SetChildIndex(this.label1, 0);
			this.Controls.SetChildIndex(this.saturationUpDown, 0);
			this.Controls.SetChildIndex(this.saturationTrackBar, 0);
			this.Controls.SetChildIndex(this.colorizeCheckBox, 0);
			this.Controls.SetChildIndex(this.resetButton, 0);
			this.Controls.SetChildIndex(this.preserveCheckBox, 0);
			this.Controls.SetChildIndex(this.brightnessDitherModeComboBox, 0);
			this.Controls.SetChildIndex(this.label7, 0);
			this.Controls.SetChildIndex(this.hueDitherModeComboBox, 0);
			this.Controls.SetChildIndex(this.label5, 0);
			this.Controls.SetChildIndex(this.saturationDitherModeComboBox, 0);
			this.Controls.SetChildIndex(this.label6, 0);
			this.Controls.SetChildIndex(this.previewCheckBox, 0);
			((System.ComponentModel.ISupportInitialize)(this.contrastTrackBar)).EndInit();
			((System.ComponentModel.ISupportInitialize)(this.contrastUpDown)).EndInit();
			((System.ComponentModel.ISupportInitialize)(this.brightnessTrackBar)).EndInit();
			((System.ComponentModel.ISupportInitialize)(this.brightnessUpDown)).EndInit();
			((System.ComponentModel.ISupportInitialize)(this.saturationTrackBar)).EndInit();
			((System.ComponentModel.ISupportInitialize)(this.saturationUpDown)).EndInit();
			((System.ComponentModel.ISupportInitialize)(this.hueTrackBar)).EndInit();
			((System.ComponentModel.ISupportInitialize)(this.hueUpDown)).EndInit();
			this.ResumeLayout(false);

		}
		#endregion

		private void colorizeCheckBox_CheckedChanged(object sender, System.EventArgs e)
		{
			InitTokenFromDialog();
		}

		private void previewCheckBox_CheckedChanged(object sender, System.EventArgs e)
		{
			InitTokenFromDialog();
		}

		private void hueUpDown_ValueChanged(object sender, System.EventArgs e)
		{
			if (hueTrackBar.Value != (int)hueUpDown.Value)
			{
				hueTrackBar.Value = (int)hueUpDown.Value;
				InitTokenFromDialog();
			}
		}

		private void hueTrackBar_ValueChanged(object sender, System.EventArgs e)
		{
			if (hueUpDown.Value != (decimal)hueTrackBar.Value)
			{
				hueUpDown.Value = (decimal)hueTrackBar.Value;
				InitTokenFromDialog();
			}
		}

		private void hueUpDown_Leave(object sender, System.EventArgs e)
		{
			if (Utility.CheckNumericUpDown(hueUpDown))
			{
				hueUpDown.Value = decimal.Parse(hueUpDown.Text);
			}
		}
		
		private void saturationUpDown_ValueChanged(object sender, System.EventArgs e)
		{
			if (saturationTrackBar.Value != (int)saturationUpDown.Value)
			{
				saturationTrackBar.Value = (int)saturationUpDown.Value;
				InitTokenFromDialog();
			}
		}

		private void saturationTrackBar_ValueChanged(object sender, System.EventArgs e)
		{
			if (saturationUpDown.Value != (decimal)saturationTrackBar.Value)
			{
				saturationUpDown.Value = (decimal)saturationTrackBar.Value;
				InitTokenFromDialog();
			}
		}

		private void saturationUpDown_Leave(object sender, System.EventArgs e)
		{
			if (Utility.CheckNumericUpDown(saturationUpDown))
			{
				saturationUpDown.Value = decimal.Parse(saturationUpDown.Text);
			}
		}

		private void ditheredgrayCheckBox_CheckedChanged(object sender, System.EventArgs e)
		{
			InitTokenFromDialog();
		}

		private void doublepixelCheckBox_CheckedChanged(object sender, System.EventArgs e)
		{
			InitTokenFromDialog();
		}

		private void preserveCheckBox_CheckedChanged(object sender, System.EventArgs e)
		{
			InitTokenFromDialog();
		}

		private void brightnessUpDown_ValueChanged(object sender, System.EventArgs e)
		{
			if (brightnessTrackBar.Value != (int)brightnessUpDown.Value)
			{
				brightnessTrackBar.Value = (int)brightnessUpDown.Value;
				InitTokenFromDialog();
			}
		}

		private void brightnessTrackBar_ValueChanged(object sender, System.EventArgs e)
		{
			if (brightnessUpDown.Value != (decimal)brightnessTrackBar.Value)
			{
				brightnessUpDown.Value = (decimal)brightnessTrackBar.Value;
				InitTokenFromDialog();
			}
		}

		private void brightnessUpDown_Leave(object sender, System.EventArgs e)
		{
			if (Utility.CheckNumericUpDown(brightnessUpDown))
			{
				brightnessUpDown.Value = decimal.Parse(brightnessUpDown.Text);
			}
		}
		
		private void contrastUpDown_ValueChanged(object sender, System.EventArgs e)
		{
			if (contrastTrackBar.Value != (int)contrastUpDown.Value)
			{
				contrastTrackBar.Value = (int)contrastUpDown.Value;
				InitTokenFromDialog();
			}
		}

		private void contrastTrackBar_ValueChanged(object sender, System.EventArgs e)
		{
			if (contrastUpDown.Value != (decimal)contrastTrackBar.Value)
			{
				contrastUpDown.Value = (decimal)contrastTrackBar.Value;
				InitTokenFromDialog();
			}
		}

		private void contrastUpDown_Leave(object sender, System.EventArgs e)
		{
			if (Utility.CheckNumericUpDown(contrastUpDown))
			{
				contrastUpDown.Value = decimal.Parse(contrastUpDown.Text);
			}
		}

		private void brightnessDitherModeComboBox_SelectedIndexChanged(object sender, System.EventArgs e)
		{
			using (new WaitCursorChanger(this))
			{
				if (brightnessDitherModeComboBox.SelectedItem != null)
				{
					((ColorRampEffectConfigToken)EffectToken).SetBrightnessDitherMode((DitherMode)brightnessDitherModeComboBox.SelectedItem);
					InitTokenFromDialog();
				}
			}
		}

		private void hueDitherModeComboBox_SelectedIndexChanged(object sender, System.EventArgs e)
		{
			using (new WaitCursorChanger(this))
			{
				if (hueDitherModeComboBox.SelectedItem != null)
				{
					((ColorRampEffectConfigToken)EffectToken).SetHueDitherMode((DitherMode)hueDitherModeComboBox.SelectedItem);
					InitTokenFromDialog();
				}
			}
		}

		private void saturationDitherModeComboBox_SelectedIndexChanged(object sender, System.EventArgs e)
		{
			using (new WaitCursorChanger(this))
			{
				if (saturationDitherModeComboBox.SelectedItem != null)
				{
					((ColorRampEffectConfigToken)EffectToken).SetSaturationDitherMode((DitherMode)saturationDitherModeComboBox.SelectedItem);
					InitTokenFromDialog();
				}
			}
		}

		private void okButton_Click(object sender, System.EventArgs e)
        {
            this.DialogResult = DialogResult.OK;
            this.Close();
        }

		private void resetButton_Click(object sender, System.EventArgs e)
		{
			hueTrackBar.Value = 0;
			saturationTrackBar.Value = 0;
			brightnessTrackBar.Value = 0;
			contrastTrackBar.Value = 0;
		}
		
		private void cancelButton_Click(object sender, System.EventArgs e)
        {
            this.Close();
        }
	}
}
