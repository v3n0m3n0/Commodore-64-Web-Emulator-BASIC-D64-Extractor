using System;
using System.Collections;
using System.ComponentModel;
using System.Drawing;
using System.Windows.Forms;

namespace PaintDotNet
{
	public class C64SaveConfigWidget : PaintDotNet.SaveConfigWidget
	{
		private System.Windows.Forms.CheckBox checkBox1;
		private System.Windows.Forms.NumericUpDown numericUpDown1;
		private System.Windows.Forms.Label label1;
		private System.Windows.Forms.NumericUpDown numericUpDown2;
		private System.Windows.Forms.Label label2;
		private System.Windows.Forms.Label label3;
		private System.Windows.Forms.NumericUpDown numericUpDown3;
		private System.ComponentModel.IContainer components = null;

		public C64SaveConfigWidget()
		{
			// This call is required by the Windows Form Designer.
			InitializeComponent();

			// TODO: Add any initialization after the InitializeComponent call
		}
		
        protected override void InitFileType()
        {
            this.fileType = new C64FileType();
        }

        protected override void InitTokenFromWidget()
        {
            // ((C64SaveConfigToken)this.Token).Quality = this.qualitySlider.Value;
        }

        protected override void InitWidgetFromToken(SaveConfigToken token)
        {
            // this.qualitySlider.Value = ((C64SaveConfigToken)token).Quality;
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
			this.checkBox1 = new System.Windows.Forms.CheckBox();
			this.numericUpDown1 = new System.Windows.Forms.NumericUpDown();
			this.label1 = new System.Windows.Forms.Label();
			this.numericUpDown2 = new System.Windows.Forms.NumericUpDown();
			this.label2 = new System.Windows.Forms.Label();
			this.label3 = new System.Windows.Forms.Label();
			this.numericUpDown3 = new System.Windows.Forms.NumericUpDown();
			((System.ComponentModel.ISupportInitialize)(this.numericUpDown1)).BeginInit();
			((System.ComponentModel.ISupportInitialize)(this.numericUpDown2)).BeginInit();
			((System.ComponentModel.ISupportInitialize)(this.numericUpDown3)).BeginInit();
			this.SuspendLayout();
			// 
			// checkBox1
			// 
			this.checkBox1.Location = new System.Drawing.Point(8, 184);
			this.checkBox1.Name = "checkBox1";
			this.checkBox1.Size = new System.Drawing.Size(160, 24);
			this.checkBox1.TabIndex = 0;
			this.checkBox1.Text = "Add runnable viewer";
			// 
			// numericUpDown1
			// 
			this.numericUpDown1.Hexadecimal = true;
			this.numericUpDown1.Increment = new System.Decimal(new int[] {
																			 1024,
																			 0,
																			 0,
																			 0});
			this.numericUpDown1.Location = new System.Drawing.Point(104, 8);
			this.numericUpDown1.Maximum = new System.Decimal(new int[] {
																		   65535,
																		   0,
																		   0,
																		   0});
			this.numericUpDown1.Name = "numericUpDown1";
			this.numericUpDown1.Size = new System.Drawing.Size(64, 20);
			this.numericUpDown1.TabIndex = 1;
			// 
			// label1
			// 
			this.label1.Location = new System.Drawing.Point(8, 8);
			this.label1.Name = "label1";
			this.label1.Size = new System.Drawing.Size(88, 23);
			this.label1.TabIndex = 2;
			this.label1.Text = "Bitmap data";
			// 
			// numericUpDown2
			// 
			this.numericUpDown2.Hexadecimal = true;
			this.numericUpDown2.Increment = new System.Decimal(new int[] {
																			 1024,
																			 0,
																			 0,
																			 0});
			this.numericUpDown2.Location = new System.Drawing.Point(104, 32);
			this.numericUpDown2.Maximum = new System.Decimal(new int[] {
																		   65535,
																		   0,
																		   0,
																		   0});
			this.numericUpDown2.Name = "numericUpDown2";
			this.numericUpDown2.Size = new System.Drawing.Size(64, 20);
			this.numericUpDown2.TabIndex = 3;
			// 
			// label2
			// 
			this.label2.Location = new System.Drawing.Point(8, 32);
			this.label2.Name = "label2";
			this.label2.Size = new System.Drawing.Size(88, 23);
			this.label2.TabIndex = 4;
			this.label2.Text = "Charmem data";
			// 
			// label3
			// 
			this.label3.Location = new System.Drawing.Point(8, 56);
			this.label3.Name = "label3";
			this.label3.Size = new System.Drawing.Size(88, 23);
			this.label3.TabIndex = 6;
			this.label3.Text = "Colormem data";
			// 
			// numericUpDown3
			// 
			this.numericUpDown3.Hexadecimal = true;
			this.numericUpDown3.Increment = new System.Decimal(new int[] {
																			 1024,
																			 0,
																			 0,
																			 0});
			this.numericUpDown3.Location = new System.Drawing.Point(104, 56);
			this.numericUpDown3.Maximum = new System.Decimal(new int[] {
																		   65535,
																		   0,
																		   0,
																		   0});
			this.numericUpDown3.Name = "numericUpDown3";
			this.numericUpDown3.Size = new System.Drawing.Size(64, 20);
			this.numericUpDown3.TabIndex = 5;
			// 
			// C64SaveConfigWidget
			// 
			this.Controls.Add(this.label3);
			this.Controls.Add(this.numericUpDown3);
			this.Controls.Add(this.label2);
			this.Controls.Add(this.numericUpDown2);
			this.Controls.Add(this.label1);
			this.Controls.Add(this.numericUpDown1);
			this.Controls.Add(this.checkBox1);
			this.Name = "C64SaveConfigWidget";
			this.Size = new System.Drawing.Size(176, 216);
			((System.ComponentModel.ISupportInitialize)(this.numericUpDown1)).EndInit();
			((System.ComponentModel.ISupportInitialize)(this.numericUpDown2)).EndInit();
			((System.ComponentModel.ISupportInitialize)(this.numericUpDown3)).EndInit();
			this.ResumeLayout(false);

		}
		#endregion
	}
}

