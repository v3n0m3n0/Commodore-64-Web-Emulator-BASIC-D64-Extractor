using System;
using System.Collections;
using System.ComponentModel;
using System.Drawing;
using System.Data;
using System.Windows.Forms;

namespace PaintDotNet
{
	/// <summary>
	/// Summary description for ColourArray.
	/// </summary>
	public class ColorArrayWidget : System.Windows.Forms.UserControl
	{
		private System.Windows.Forms.Panel[] panels = new Panel[17];
		// private System.Windows.Forms.HScrollBar hScrollBar1;
		private System.Windows.Forms.GroupBox groupBox1;

		private ColorBgra lastForeColor;
		private ColorBgra lastBackColor;

		private int currentIndex;

		/// <summary> 
		/// Required designer variable.
		/// </summary>
		private System.ComponentModel.Container components = null;


		public ColorArrayWidget()
		{
			int dx, dy, sizex, sizey, xoffset, yoffset, x ,y;

			xoffset = 5; yoffset = 10;
			dx = 18; dy = 18;
			sizex = 16; sizey = 16;

			// This call is required by the Windows.Forms Form Designer.
			InitializeComponent();

			// TODO: Add any initialization after the InitializeComponent call

			this.groupBox1 = new System.Windows.Forms.GroupBox();

			// add the default 16 colours
			for(x=0; x<2; x++)
			{
				for(y=0; y<8; y++)
				{
					this.panels[x*8+y] = new System.Windows.Forms.Panel();

					this.panels[x*8+y].BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle; // Fixed3D;
					this.panels[x*8+y].Location = new System.Drawing.Point(xoffset + x*dx, yoffset + y*dy);
					// this.panels[x*8+y].Name = "panel1";
					this.panels[x*8+y].Size = new System.Drawing.Size(sizex, sizey);
					this.panels[x*8+y].TabIndex = x*8+y;
					this.panels[x*8+y].BackColor = Color.FromArgb(ColorBgra.c64colors[x*8+y].A, ColorBgra.c64colors[x*8+y].R, ColorBgra.c64colors[x*8+y].G, ColorBgra.c64colors[x*8+y].B);
					// this.panels[x*8+y].Paint += new System.Windows.Forms.PaintEventHandler(this.panels_Paint);
					this.panels[x*8+y].MouseDown += new System.Windows.Forms.MouseEventHandler(this.OnMouseDownPanel);

					this.groupBox1.Controls.Add(this.panels[x*8+y]);
				}
			}

			// and a panel for a transparent colour
			this.panels[16] = new System.Windows.Forms.Panel();

			this.panels[16].BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle; // HACK, was Fixed3D;
			this.panels[16].Location = new System.Drawing.Point(xoffset + 0*dx, yoffset + 8*dy);
			// this.panels[x*8+y].Name = "panel1";
			this.panels[16].Size = new System.Drawing.Size(sizex, sizey);
			this.panels[16].TabIndex = 16;
			this.panels[16].BackColor = Color.FromArgb(ColorBgra.c64colors[16].A, ColorBgra.c64colors[16].R, ColorBgra.c64colors[16].G, ColorBgra.c64colors[16].B);
			this.panels[16].BackgroundImage = new Bitmap(Utility.GetImageResource("Icons.TransparentIcon.bmp")); // ((System.Drawing.Image)(resources.GetObject("panel1.BackgroundImage")));
			// this.panels[x*8+y].Paint += new System.Windows.Forms.PaintEventHandler(this.panels_Paint);
			this.panels[16].MouseDown += new System.Windows.Forms.MouseEventHandler(this.OnMouseDownPanel);

			this.groupBox1.Controls.Add(this.panels[16]);

			// 
			// hScrollBar1
			// 
			// this.hScrollBar1 = new System.Windows.Forms.HScrollBar();
			// this.SuspendLayout();

			// this.hScrollBar1.Location = new System.Drawing.Point(xoffset, 154);
			// this.hScrollBar1.Name = "hScrollBar1";
			// this.hScrollBar1.Size = new System.Drawing.Size(sizex+dx, 16);
			// this.hScrollBar1.TabIndex = 16;

			// this.groupBox1.Controls.Add(this.hScrollBar1);

			this.groupBox1.Location = new System.Drawing.Point(2, 0);
			this.groupBox1.Name = "groupBox1";
			this.groupBox1.Size = new System.Drawing.Size(44, 175);
			this.groupBox1.TabIndex = 0;
			this.groupBox1.TabStop = false;
			this.groupBox1.Text = "";

			this.groupBox1.SuspendLayout();

			this.Controls.Add(this.groupBox1);
			this.groupBox1.ResumeLayout(true);

			this.SuspendLayout();
		}


		public event ColorEventHandler UserForeColorChanged;
		protected virtual void OnUserForeColorChanged(ColorBgra newColor)
		{
			if (UserForeColorChanged != null)
			{
				UserForeColorChanged(this, new ColorEventArgs(newColor));
				UserForeColorChanged(this, new ColorEventArgs(newColor)); // HACK, for some reason we have to do this twice
				lastForeColor = newColor;
			}
			else
			{
				Utility.ErrorBox(this, "no UserForeColorChanged");
			}
		}

		public event ColorEventHandler UserBackColorChanged;
		protected virtual void OnUserBackColorChanged(ColorBgra newColor)
		{
			if (UserBackColorChanged != null)
			{
				UserBackColorChanged(this, new ColorEventArgs(newColor));
				lastBackColor = newColor;
			}
		}

		private void OnMouseDownPanel(object sender, MouseEventArgs e) 
		{
			Panel panel = (Panel)sender;

			System.Drawing.Color c = panel.BackColor;

			if(e.Button == MouseButtons.Left)
				OnUserForeColorChanged(ColorBgra.FromBgra(c.B, c.G, c.R, c.A));
			else if(e.Button == MouseButtons.Right)
				OnUserBackColorChanged(ColorBgra.FromBgra(c.B, c.G, c.R, c.A));

			this.currentIndex = panel.TabIndex;

			// panel.BackColor = Color.FromArgb(255, 0, 0, 0);
		}

		public void HandleKeyHack(char key)
		{
			int index = 0;
			bool keyfound = false;

			switch(key)
			{
				case '0': index = 0;  keyfound = true; break;
				case '1': index = 1;  keyfound = true; break;
				case '2': index = 2;  keyfound = true; break;
				case '3': index = 3;  keyfound = true; break;
				case '4': index = 4;  keyfound = true; break;
				case '5': index = 5;  keyfound = true; break;
				case '6': index = 6;  keyfound = true; break;
				case '7': index = 7;  keyfound = true; break;
				case '8': index = 8;  keyfound = true; break;
				case '9': index = 9;  keyfound = true; break;
				case 'a': index = 10; keyfound = true; break;
				case 'b': index = 11; keyfound = true; break;
				case 'c': index = 12; keyfound = true; break;
				case 'd': index = 13; keyfound = true; break;
				case 'e': index = 14; keyfound = true; break;
				case 'f': index = 15; keyfound = true; break;
				case ';': index = currentIndex - 1; if (index < 0 ) index = 15; keyfound = true; break;
				case '\'': index = currentIndex + 1; if (index > 15) index = 0;  keyfound = true; break;
			}

			if(keyfound)
			{
				currentIndex = index;
				OnUserForeColorChanged(ColorBgra.c64colors[index]);
			}
		}

		/// <summary> 
		/// Clean up any resources being used.
		/// </summary>
		protected override void Dispose( bool disposing )
		{
			if( disposing )
			{
				if(components != null)
				{
					components.Dispose();
				}
			}
			base.Dispose( disposing );
		}

		#region Component Designer generated code
		/// <summary> 
		/// Required method for Designer support - do not modify 
		/// the contents of this method with the code editor.
		/// </summary>
		private void InitializeComponent()
		{
			// 
			// ColorArrayWidget
			// 
			this.Name = "ColorArrayWidget";
			this.Size = new System.Drawing.Size(48, 104);
			this.currentIndex = 0;

		}
		#endregion

	}
}
