using System;
using System.Collections;
using System.Collections.Specialized;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.Serialization;
using System.Threading;

namespace PaintDotNet
{
    /// <summary>
    /// Summary description for BitmapLayer.
    /// </summary>
    [Serializable]
    public class BitmapLayer
        : Layer,
          IDeserializationCallback
    {
        private bool disposed = false;
        protected override void Dispose(bool disposing)
        {
            if (!disposed)
            {
                disposed = true;

                try
                {
                    if (disposing)
                    {
                        if (surface != null)
                        {
                            surface.Dispose();
                            surface = null;
                        }
						if (colorsurface != null)
						{
							colorsurface.Dispose();
							colorsurface = null;
						}
						if (charhighsurface != null)
						{
							charhighsurface.Dispose();
							charhighsurface = null;
						}
						if (charlowsurface != null)
						{
							charlowsurface.Dispose();
							charlowsurface = null;
						}
						if(argsurface != null)
						{
							argsurface.Dispose();
							argsurface = null;
						}
					}
                }
                    
                finally
                {
                    base.Dispose(disposing);
                }
            }
        }

        private IPixelOp compiledBlendOp = null;

        /// <summary>
        /// This handles the case when blendOp is null, but opacity is not equal to 255
        /// </summary>
        [Serializable]
        private sealed class BlendWithOpacityOp
            : BinaryPixelOp
        {
            private int opacity;

            public override ColorBgra Apply(ColorBgra lhs, ColorBgra rhs)
            {
                rhs.A = (byte)(((1 + rhs.A) * opacity) / 256);
                return BinaryPixelOps.AlphaBlend.ApplyStatic(lhs, rhs);
            }

            protected override unsafe void Apply(ColorBgra * dst, ColorBgra * lhs, ColorBgra * rhs, int length)
            {
                while (length > 0)
                {
                    int rhsA = ((1 + rhs->A) * opacity) / 256;
                    int invRhsA = 256 - rhsA;
                    int lhsA = lhs->A + 1;
                    int invLhsA = 256 - lhsA;

                    int r = (((invRhsA * (lhsA * lhs->R)) / 256) + (rhsA * rhs->R)) / 256;
                    int g = (((invRhsA * (lhsA * lhs->G)) / 256) + (rhsA * rhs->G)) / 256;
                    int b = (((invRhsA * (lhsA * lhs->B)) / 256) + (rhsA * rhs->B)) / 256;
                    int a = ComputeAlpha(lhs->A, rhs->A);
                
                    dst->Bgra = (uint)(b + (g << 8) + (r << 16) + ((uint)a << 24));

                    ++dst;
                    ++lhs;
                    ++rhs;
                    --length;
                }
            }

            protected override unsafe void Apply(ColorBgra * dst, ColorBgra * src, int length)
            {
                while (length > 0)
                {
                    int srcA = ((1 + src->A) * opacity) / 256;
                    int invSrcA = 256 - srcA;
                    int dstA = dst->A + 1;

                    int r = (((invSrcA * (dstA * dst->R)) / 256) + (srcA * src->R)) / 256;
                    int g = (((invSrcA * (dstA * dst->G)) / 256) + (srcA * src->G)) / 256;
                    int b = (((invSrcA * (dstA * dst->B)) / 256) + (srcA * src->B)) / 256;
                    int a = ComputeAlpha(dst->A, src->A);

                    dst->Bgra = (uint)(b + (g << 8) + (r << 16) + ((uint)a << 24));

                    ++dst;
                    ++src;
                    --length;
                }
            }

            public BlendWithOpacityOp(int opacity)
            {
                this.opacity = opacity;
            }
        }

        /// <summary>
        /// This handles the case when blendOp is not null, and opacity is not 255
        /// </summary>
        [Serializable]
        private sealed class BlendWithBlendOpAndOpacityOp
            : BinaryPixelOp
        {
            private int opacity;
            private BinaryPixelOp op;

            public override ColorBgra Apply(ColorBgra lhs, ColorBgra rhs)
            {
                ColorBgra mid = op.Apply(lhs, rhs);
                mid.A = (byte)(((1 + mid.A) * opacity) / 256);
                return BinaryPixelOps.AlphaBlend.ApplyStatic(lhs, mid);
            }

            public BlendWithBlendOpAndOpacityOp(int opacity, BinaryPixelOp op)
            {
                this.opacity = opacity;
                this.op = op;
            }
        }

        private void CompileBlendOp()
        {
            bool isDefaultOp = (properties.blendOp.GetType() == UserBlendOps.GetDefaultBlendOp());

            if (isDefaultOp && this.Opacity == 255)
            {
                compiledBlendOp = new BinaryPixelOps.AlphaBlend();
            }
            else if (isDefaultOp && this.Opacity != 255)
            {
                compiledBlendOp = new BitmapLayer.BlendWithOpacityOp(this.Opacity);
            }
            else if (!isDefaultOp && this.Opacity == 255)
            {
                compiledBlendOp = properties.blendOp;
            }
            else if (!isDefaultOp && this.Opacity != 255)
            {
                compiledBlendOp = new BitmapLayer.BlendWithBlendOpAndOpacityOp(this.Opacity, properties.blendOp);
            }
        }

        protected override void OnPropertyChanged(string propertyName)
        {
            compiledBlendOp = null;
            base.OnPropertyChanged (propertyName);
        }

        [Serializable]
        internal sealed class BitmapLayerProperties
            : ICloneable,
              ISerializable
        {
            public UserBlendOp blendOp;
			public RestrictMode restrictMode;
            internal int opacity; // this is ONLY used when loading older version PDN files! should normally equal -1

            public const string BlendOpName = "Blend Mode";
			public const string RestrictModeName = "Restrict Mode";

            public BitmapLayerProperties(UserBlendOp blendOp, RestrictMode restrictMode)
            {
                this.blendOp = blendOp;
				this.restrictMode = restrictMode;
                this.opacity = -1;
            }

            public BitmapLayerProperties(BitmapLayerProperties cloneMe)
            {
                this.blendOp = cloneMe.blendOp;
				this.restrictMode = cloneMe.restrictMode;
				this.opacity = -1;
            }

			#region ICloneable Members

            public object Clone()
            {
                return new BitmapLayerProperties(this);
            }

            #endregion

            #region ISerializable Members

            public BitmapLayerProperties(SerializationInfo info, StreamingContext context)
            {
                this.blendOp = (UserBlendOp)info.GetValue("blendOp", typeof(UserBlendOp));
				this.restrictMode = (RestrictMode)info.GetValue("restrictMode", typeof(RestrictMode));

                // search for 'opacity' and load it if it exists
                this.opacity = -1;

                foreach (SerializationEntry entry in info)
                {
                    if (entry.Name == "opacity")
                    {
                        this.opacity = (int)((byte)entry.Value);
                        break;
                    }
                }
            }

            public void GetObjectData(SerializationInfo info, StreamingContext context)
            {
                info.AddValue("blendOp", this.blendOp);
				info.AddValue("restrictMode", this.restrictMode);
			}

            #endregion
        }

        private BitmapLayerProperties properties;
        private Surface surface;
		private Surface charhighsurface;
		private Surface charlowsurface;
		private Surface colorsurface;
		private Surface argsurface;

        public override object SaveProperties()
        {
            if (disposed)
            {
                throw new ObjectDisposedException("BitmapLayer");
            }

            object baseProperties = base.SaveProperties();
            return new List(properties.Clone(), new List(baseProperties, null));
        }

        public override void LoadProperties(object oldState, bool suppressEvents)
        {
            if (disposed)
            {
                throw new ObjectDisposedException("BitmapLayer");
            }

            List list = (List)oldState;

            // Get the base class' state, and our state
            LayerProperties baseState = (LayerProperties)list.Tail.Head;
            BitmapLayerProperties blp = (BitmapLayerProperties)(((List)oldState).Head);

            // Opacity is only couriered for compatibility with PDN v2.0 and v1.1
            // files. It should not be present in v2.1+ files (well, it'll be
            // part of the base class' serialization)
            if (blp.opacity != -1)
            {
                baseState.opacity = (byte)blp.opacity;
                blp.opacity = -1;
            }            

            // Have the base class load its properties
            base.LoadProperties(baseState, suppressEvents);

            // Now load our properties, and announce them to the world
            bool raiseBlendOp = false;

            if (blp.blendOp.GetType() != properties.blendOp.GetType())
            {
                if (!suppressEvents)
                {
                    raiseBlendOp = true;
                    OnPropertyChanging(BitmapLayerProperties.BlendOpName);
                }
            }

            this.properties = (BitmapLayerProperties)blp.Clone();
            this.compiledBlendOp = null;

            Invalidate();

            if (raiseBlendOp)
            {
                OnPropertyChanged(BitmapLayerProperties.BlendOpName);
            }
        }

        public void SetBlendOp(UserBlendOp blendOp)
        {
            if (disposed)
            {
                throw new ObjectDisposedException("BitmapLayer");
            }

            if (blendOp.GetType() != properties.blendOp.GetType())
            {
                OnPropertyChanging(BitmapLayerProperties.BlendOpName);
                properties.blendOp = blendOp;
                compiledBlendOp = null;
                Invalidate();
                OnPropertyChanged(BitmapLayerProperties.BlendOpName);
            }
        }

		public void SetRestrictMode(RestrictMode restrictMode)
		{
			if (disposed)
			{
				throw new ObjectDisposedException("BitmapLayer");
			}

			if (restrictMode.GetType() != properties.restrictMode.GetType())
			{
				OnPropertyChanging(BitmapLayerProperties.RestrictModeName);
				properties.restrictMode = restrictMode;
				Invalidate();
				OnPropertyChanged(BitmapLayerProperties.RestrictModeName);
			}
		}
		
		public override object Clone()
        {
            if (disposed)
            {
                throw new ObjectDisposedException("BitmapLayer");
            }

            return (object)new BitmapLayer(this);
        }

        public Surface Surface
        {
            get
            {
                if (disposed)
                {
                    throw new ObjectDisposedException("BitmapLayer");
                }

                return surface;
            }
        }

		public Surface CharlowSurface
		{
			get
			{
				if (disposed)
				{
					throw new ObjectDisposedException("BitmapLayer");
				}

				return charlowsurface;
			}
		}
		
		public Surface CharhighSurface
		{
			get
			{
				if (disposed)
				{
					throw new ObjectDisposedException("BitmapLayer");
				}

				return charhighsurface;
			}
		}
		
		public Surface ColorSurface
		{
			get
			{
				if (disposed)
				{
					throw new ObjectDisposedException("BitmapLayer");
				}

				return colorsurface;
			}
		}
		
		public Surface ArgSurface
		{
			get
			{
				if (disposed)
				{
					throw new ObjectDisposedException("BitmapLayer");
				}

				return argsurface;
			}
		}

		public UserBlendOp BlendOp
        {
            get
            {
                if (disposed)
                {
                    throw new ObjectDisposedException("BitmapLayer");
                }

                return properties.blendOp;
            }
        }

		public RestrictMode GetRestrictMode
		{
			get
			{
				if (disposed)
				{
					throw new ObjectDisposedException("BitmapLayer");
				}

				return properties.restrictMode;
			}
		}

        public BitmapLayer(int width, int height)
            : this(width, height, ColorBgra.FromBgra(255, 255, 255, 0))
        {
        }

        public BitmapLayer(int width, int height, ColorBgra fillColor)
            : base(width, height)
        {
			int charwidth, charheight;

            this.surface = new Surface(width, height);

			charwidth = width>>3;
			charheight = height>>3;
			if(width % 8 != 0) charwidth += 1;
			if(height % 8 != 0) charheight += 1;
			this.charhighsurface = new Surface(charwidth, charheight*8);
			this.charlowsurface = new Surface(charwidth, charheight*8);
			this.colorsurface = new Surface(charwidth, charheight);
			this.argsurface = new Surface(charwidth, charheight*8);

            // clear to see-through white, 0x00ffffff
            this.Surface.Clear(fillColor);
			this.CharhighSurface.Clear(fillColor);
			this.CharlowSurface.Clear(fillColor);
			this.ColorSurface.Clear(fillColor);
			this.ArgSurface.Clear(ColorBgra.FromBgra(36,0,0,0));
			this.properties = new BitmapLayerProperties(UserBlendOps.CreateDefaultBlendOp(), RestrictModes.CreateDefaultRestrictMode());
        }

        /// <summary>
        /// Creates a new BitmapLayer of the same size as the given Surface, and copies the 
        /// pixels from the given Surface.
        /// </summary>
        /// <param name="surface">The Surface to copy pixels from.</param>
        public BitmapLayer(Surface surface)
            : this(surface, false)
        {
        }

        /// <summary>
        /// Creates a new BitmapLayer of the same size as the given Surface, and either
        /// copies the pixels of the given Surface or takes ownership of it.
        /// </summary>
        /// <param name="surface">The Surface.</param>
        /// <param name="takeOwnership">
        /// true to take ownership of the surface (make sure to Dispose() it yourself), or
        /// false to copy its pixels
        /// </param>
        public BitmapLayer(Surface surface, bool takeOwnership)
            : base(surface.Width, surface.Height)
        {
			int charwidth, charheight;
			ColorBgra fillColor = ColorBgra.FromUInt32(0x00ffffff);

			if (takeOwnership)
            {
                this.surface = surface;
            }
            else
            {
                this.surface = surface.Clone();
            }

			charwidth = this.surface.Width>>3;
			charheight = this.surface.Height>>3;
			if(this.surface.Width % 8 != 0) charwidth += 1;
			if(this.surface.Height % 8 != 0) charheight += 1;
			this.charhighsurface = new Surface(charwidth, charheight*8);
			this.charlowsurface = new Surface(charwidth, charheight*8);
			this.colorsurface = new Surface(charwidth, charheight);
			this.argsurface = new Surface(charwidth, charheight*8);

			// clear to see-through white, 0x00ffffff
			this.CharhighSurface.Clear(fillColor);
			this.CharlowSurface.Clear(fillColor);
			this.ColorSurface.Clear(fillColor);
			this.ArgSurface.Clear(ColorBgra.FromBgra(36,0,0,0));
			
			this.properties = new BitmapLayerProperties(UserBlendOps.CreateDefaultBlendOp(), RestrictModes.CreateDefaultRestrictMode());
        }

        protected BitmapLayer(BitmapLayer copyMe)
            : base(copyMe)
        {
            this.surface = copyMe.Surface.Clone();
			this.colorsurface = copyMe.ColorSurface.Clone();
			this.argsurface = copyMe.ArgSurface.Clone();
			this.charhighsurface = copyMe.CharhighSurface.Clone();
			this.charlowsurface = copyMe.CharlowSurface.Clone();
			this.properties = (BitmapLayerProperties)copyMe.properties.Clone();
        }

        public BitmapLayer(Image image)
            : base(image.Width, image.Height)
        {
            using (Bitmap bitmap = Surface.CreateAliasedBitmap())
            {
                using (Graphics g = Graphics.FromImage(bitmap))
                {
                    g.DrawImage(image, 0, 0, image.Width, image.Height);
                }
            }
        }

		void RestrictToFLI8Chars(Surface dst, Surface src, Point srcOffset, bool autofix, bool addtransparency)
		{
			int x, y, i;
			int numcol, numcolors, numclashrows, numclashrows8;
			ColorBgra[] colors;
			int[] numoccurance;

			colors = new ColorBgra[64];
			numclashrows = 0;
			numcolors = 0;

			unsafe
			{
				for(y = 0; y<8; y++)
				{
					numcol = 0;
					numclashrows8 = numclashrows * 8;

					ColorBgra *srcPtr = src.GetPointAddress(srcOffset.X, srcOffset.Y + y);

					for(x=0; x<8; x++)
					{
						if(srcPtr->A != 0)
						{
							numcolors++;

							if(numcol == 0)
							{
								colors[numclashrows8 + 0] = *srcPtr;
								numcol++;
							}
							else if(numcol == 1 && colors[numclashrows8 + 0] != *srcPtr)
							{
								colors[numclashrows8 + 1] = *srcPtr;
								numcol++;
							}
							else if(numcol == 2 && colors[numclashrows8 + 0] != *srcPtr && colors[numclashrows8 + 1] != *srcPtr)
							{
								colors[numclashrows8 + 2] = *srcPtr;
								numcol++;
								numclashrows++;
							}
						}
						srcPtr++;
					}
				}
			}

			numoccurance = new int[3];

			for(numcol = 0; numcol < 3; numcol++)
			{
				numoccurance[numcol] = 0;

				uint testcolor = colors[numcol].Bgra;

				for(i=0; i<numclashrows; i++)
				{
					if(testcolor == colors[i*8+0].Bgra || testcolor == colors[i*8+1].Bgra || testcolor == colors[i*8+2].Bgra)
					{
						numoccurance[numcol] += 1;
					}
				}
			}

			int bestfit = 0;
			if(numoccurance[1] > numoccurance[bestfit]) bestfit = 1;
			if(numoccurance[2] > numoccurance[bestfit]) bestfit = 2;

			this.ColorSurface[srcOffset.X/8, srcOffset.Y/8] = colors[bestfit];

			uint colors0 = this.ColorSurface[srcOffset.X/8, srcOffset.Y/8].Bgra;
			ColorBgra c0 = this.ColorSurface[srcOffset.X/8, srcOffset.Y/8];

			uint faultycolor = ColorBgra.FromBgra(0,0,255,255).Bgra;
			ColorBgra transparent = ColorBgra.FromBgra(0,0,0,0);

			colors[0] = this.ColorSurface[srcOffset.X/8, srcOffset.Y/8];
			colors[1] = transparent;
			colors[2] = transparent;

			unsafe
			{
				for(y = 0; y<8; y++)
				{
					ColorBgra *srcPtr = src.GetPointAddress(srcOffset.X, srcOffset.Y + y);
					ColorBgra *dstPtr = dst.GetPointAddress(srcOffset.X, srcOffset.Y + y);

					this.CharhighSurface[srcOffset.X/8, srcOffset.Y + y] = transparent;
					this.CharlowSurface[srcOffset.X/8, srcOffset.Y + y] = transparent;

					numcolors = 1;

					for(x=0; x<8; x++)
					{
						if(srcPtr->A != 0)
						{
							if(numcolors == 1) // second color we find
							{
								// is it the colorram color?
								if(srcPtr->Bgra != colors0)
								{
									// no, so it has to go into charlow
									dstPtr->Bgra = srcPtr->Bgra;
									colors[1] = *srcPtr;
									numcolors++;
								}
								// if it is the colorram color, do nothing
							}
							else if(numcolors == 2) // third color we find
							{
								// is it the colorram color or the high charhighram color?
								if(srcPtr->Bgra != colors0 && srcPtr->Bgra != colors[1].Bgra)
								{
									// no, so it has to go into charhigh
									dstPtr->Bgra = srcPtr->Bgra;
									colors[2] = *srcPtr;
									numcolors++;
								}
							}
							else if(numcolors == 3) // fourth color we find
							{
								if( srcPtr->Bgra != colors0 &&
									srcPtr->Bgra != colors[1].Bgra &&
									srcPtr->Bgra != colors[2].Bgra
									) // this can't be right
									if(autofix)
										// IMPORTANT!!! this should take into acount the layer blending???
										dstPtr->Bgra = ColorBgra.closest3(*srcPtr, c0, colors[1], colors[2]).Bgra;
									else
										dstPtr->Bgra = faultycolor;
							}
						}

						srcPtr++;
						dstPtr++;
					}
					CharlowSurface [srcOffset.X/8, srcOffset.Y + y] = colors[(this.ArgSurface[srcOffset.X/8, srcOffset.Y + y].B & 12)>>2];
					CharhighSurface[srcOffset.X/8, srcOffset.Y + y] = colors[(this.ArgSurface[srcOffset.X/8, srcOffset.Y + y].B & 48)>>4];
				}
				ColorSurface   [srcOffset.X/8, srcOffset.Y/8] = colors[(this.ArgSurface[srcOffset.X/8, srcOffset.Y/8].B & 3)];
			}
		}

		void RestrictToAFLI8Chars(Surface dst, Surface src, Point srcOffset, bool autofix, bool addtransparency)
		{
			int x, y, z, i;
			int numcolors;
			ColorBgra[] colors;

			colors = new ColorBgra[8];

			unsafe
			{
				for(z = 0; z<8; z++)
				{
					numcolors = 0;

					ColorBgra *srcPtr = src.GetPointAddress(srcOffset.X, srcOffset.Y + z);

					for(x=0; x<8; x++)
					{
						if(srcPtr->A != 0)
						{
							for(i = 0; i < numcolors; i++)
							{
								if(	colors[i].R == srcPtr->R &&
									colors[i].G == srcPtr->G &&
									colors[i].B == srcPtr->B)
								{
									// we keep track of the number of occurances in the alpha channel...
									// make sure they get put back to 255 later
									colors[i].A += 1;
									break;
								}
							}
	
							// oops, this is a new color... add to array
							if(i == numcolors)
							{
								colors[i] = *srcPtr;
								colors[i].A = 1;
								numcolors++;
							}
						}
						srcPtr++;
					}

					// find most present color in char
					int highestoccurance = 0;
					for(i=1; i<numcolors; i++)
						if(colors[i].A > colors[highestoccurance].A)
							highestoccurance = i;

					if(colors[0] != colors[highestoccurance])
					{
						ColorBgra tempcolor = colors[highestoccurance];
						for(i=highestoccurance; i>0; i--)
							colors[i] = colors[i-1];
						colors[0] = tempcolor;
					}

					// find second most present color in char
					highestoccurance = 1;
					for(i=2; i<numcolors; i++)
						if(colors[i].A > colors[highestoccurance].A)
							highestoccurance = i;

					if(colors[1] != colors[highestoccurance])
					{
						ColorBgra tempcolor = colors[highestoccurance];
						for(i=highestoccurance; i>1; i--)
							colors[i] = colors[i-1];
						colors[1] = tempcolor;
					}

					// done
					colors[0].A = 255;
					colors[1].A = 255;

					if(numcolors < 2) colors[1] = ColorBgra.FromBgra(0, 0, 0, 0);
					if(numcolors < 3) colors[2] = ColorBgra.FromBgra(0, 0, 0, 0);

					x = srcOffset.X/8;
					y = srcOffset.Y+z;

					ColorBgra transparent = ColorBgra.FromBgra(0,0,0,0);
					this.ColorSurface[x, y/8] = transparent;

					if(numcolors > 0) this.CharlowSurface[x, y] = colors[0];
					else this.CharlowSurface[x,y] = transparent;
					if(numcolors > 1) this.CharhighSurface[x, y] = colors[1];
					else this.CharhighSurface[x,y] = transparent;

					this.CharlowSurface [x, y] = colors[(this.ArgSurface[x, y].B & 3)];
					this.CharhighSurface[x, y] = colors[(this.ArgSurface[x, y].B & 12)>>2];

					uint colors0 = this.CharlowSurface[x, y].Bgra;
					uint colors1 = this.CharhighSurface[x, y].Bgra;

					uint faultycolor = ColorBgra.FromBgra(0,0,255,255).Bgra;
					ColorBgra c0 = this.CharlowSurface [x, y];
					ColorBgra c1 = this.CharhighSurface[x, y];

					srcPtr = src.GetPointAddress(srcOffset.X, y);
					ColorBgra *dstPtr = dst.GetPointAddress(srcOffset.X, y);

					for(x=0; x<8; x++)
					{
						if(srcPtr->A < 255 || (srcPtr->Bgra != colors0 && srcPtr->Bgra != colors1))
						{
							if(autofix)
								dstPtr->Bgra = ColorBgra.closest2(*srcPtr, c0, c1).Bgra;
							else
								dstPtr->Bgra = faultycolor;
						}

						if(addtransparency && dstPtr->A == 255 && srcPtr->Bgra == colors0)
						{
							dstPtr->A = 0;
						}

						srcPtr++;
						dstPtr++;
					}
				}
			}
		}

		void RestrictToAFLI4Chars(Surface dst, Surface src, Point srcOffset, bool autofix, bool addtransparency)
		{
			int x, y, z, i, q;
			int numcolors;
			ColorBgra[] colors;

			colors = new ColorBgra[16];

			unsafe
			{
				for(z = 0; z<4; z++)
				{
					numcolors = 0;

					for(q = 0; q < 2; q++)
					{
						ColorBgra *srcPtr = src.GetPointAddress(srcOffset.X, srcOffset.Y + z*2 + q);

						for(x=0; x<8; x++)
						{
							if(srcPtr->A != 0)
							{
								for(i = 0; i < numcolors; i++)
								{
									if(	colors[i].R == srcPtr->R &&
										colors[i].G == srcPtr->G &&
										colors[i].B == srcPtr->B)
									{
										// we keep track of the number of occurances in the alpha channel...
										// make sure they get put back to 255 later
										colors[i].A += 1;
										break;
									}
								}
	
								// oops, this is a new color... add to array
								if(i == numcolors)
								{
									colors[i] = *srcPtr;
									colors[i].A = 1;
									numcolors++;
								}
							}
							srcPtr++;
						}
					}

					// find most present color in char
					int highestoccurance = 0;
					for(i=1; i<numcolors; i++)
						if(colors[i].A > colors[highestoccurance].A)
							highestoccurance = i;

					if(colors[0] != colors[highestoccurance])
					{
						ColorBgra tempcolor = colors[highestoccurance];
						for(i=highestoccurance; i>0; i--)
							colors[i] = colors[i-1];
						colors[0] = tempcolor;
					}

					// find second most present color in char
					highestoccurance = 1;
					for(i=2; i<numcolors; i++)
						if(colors[i].A > colors[highestoccurance].A)
							highestoccurance = i;

					if(colors[1] != colors[highestoccurance])
					{
						ColorBgra tempcolor = colors[highestoccurance];
						for(i=highestoccurance; i>1; i--)
							colors[i] = colors[i-1];
						colors[1] = tempcolor;
					}

					// done
					colors[0].A = 255;
					colors[1].A = 255;

					if(numcolors < 2) colors[1] = ColorBgra.FromBgra(0, 0, 0, 0);
					if(numcolors < 3) colors[2] = ColorBgra.FromBgra(0, 0, 0, 0);

					x = srcOffset.X/8;
					y = srcOffset.Y+4+z; // AFLI every 2 lines... only use the last 4 charbanks

					ColorBgra transparent = ColorBgra.FromBgra(0,0,0,0);
					this.ColorSurface[x, y/8] = transparent;

					if(numcolors > 0) this.CharlowSurface[x, y] = colors[0];
					else this.CharlowSurface[x,y] = transparent;
					if(numcolors > 1) this.CharhighSurface[x, y] = colors[1];
					else this.CharhighSurface[x,y] = transparent;

					this.CharlowSurface [x, y] = colors[(this.ArgSurface[x, y].B & 3)];
					this.CharhighSurface[x, y] = colors[(this.ArgSurface[x, y].B & 12)>>2];

					uint colors0 = this.CharlowSurface[x, y].Bgra;
					uint colors1 = this.CharhighSurface[x, y].Bgra;

					uint faultycolor = ColorBgra.FromBgra(0,0,255,255).Bgra;
					ColorBgra c0 = this.CharlowSurface [x, y];
					ColorBgra c1 = this.CharhighSurface[x, y];

					for(q = 0; q < 2; q++)
					{
						ColorBgra *srcPtr = src.GetPointAddress(srcOffset.X, srcOffset.Y+z*2+q);
						ColorBgra *dstPtr = dst.GetPointAddress(srcOffset.X, srcOffset.Y+z*2+q);

						for(x=0; x<8; x++)
						{
							if(srcPtr->A < 255 || (srcPtr->Bgra != colors0 && srcPtr->Bgra != colors1))
							{
								if(autofix)
									dstPtr->Bgra = ColorBgra.closest2(*srcPtr, c0, c1).Bgra;
								else
									dstPtr->Bgra = faultycolor;
							}

							if(addtransparency && dstPtr->A == 255 && srcPtr->Bgra == colors1)
							{
								dstPtr->A = 0;
							}

							srcPtr++;
							dstPtr++;
						}
					}
				}
			}
		}

		void RestrictToArtStudioHigherChars(Surface dst, Surface src, Point srcOffset, bool autofix, bool addtransparency)
		{
			int x, y, i;
			int numcolors;
			ColorBgra[] colors;

			colors = new ColorBgra[64];
			numcolors = 0;

			unsafe
			{
				for(y = 0; y<8; y++)
				{
					ColorBgra *srcPtr = src.GetPointAddress(srcOffset.X, srcOffset.Y + y);

					for(x=0; x<8; x++)
					{
						if(srcPtr->A != 0)
						{
							for(i = 0; i < numcolors; i++)
							{
								if(	colors[i].R == srcPtr->R &&
									colors[i].G == srcPtr->G &&
									colors[i].B == srcPtr->B)
								{
									// we keep track of the number of occurances in the alpha channel...
									// make sure they get put back to 255 later
									colors[i].A += 1;
									break;
								}
							}
	
							// oops, this is a new color... add to array
							if(i == numcolors)
							{
								colors[i] = *srcPtr;
								colors[i].A = 1;
								numcolors++;
							}
						}
						srcPtr++;
					}
				}
			}

			// find most present color in char
			int highestoccurance = 0;
			for(i=1; i<numcolors; i++)
				if(colors[i].A > colors[highestoccurance].A)
					highestoccurance = i;

			if(colors[0] != colors[highestoccurance])
			{
				ColorBgra tempcolor = colors[highestoccurance];
				for(i=highestoccurance; i>0; i--)
					colors[i] = colors[i-1];
				colors[0] = tempcolor;
			}

			// find second most present color in char
			highestoccurance = 1;
			for(i=2; i<numcolors; i++)
				if(colors[i].A > colors[highestoccurance].A)
					highestoccurance = i;

			if(colors[1] != colors[highestoccurance])
			{
				ColorBgra tempcolor = colors[highestoccurance];
				for(i=highestoccurance; i>1; i--)
					colors[i] = colors[i-1];
				colors[1] = tempcolor;
			}

			// done
			colors[0].A = 255;
			colors[1].A = 255;

			if(numcolors < 2) colors[1] = ColorBgra.FromBgra(0, 0, 0, 0);
			if(numcolors < 3) colors[2] = ColorBgra.FromBgra(0, 0, 0, 0);

			x = srcOffset.X/8;
			y = srcOffset.Y; // this is snapped to 0,8,16 etc. because we're checking chars, not lines

			ColorBgra transparent = ColorBgra.FromBgra(0,0,0,0);
			this.ColorSurface[x, y/8] = transparent;

			// if(numcolors > 0) this.CharlowSurface[x, y] = colors[0];
			// else this.CharlowSurface[x,y] = transparent;
			// if(numcolors > 1) this.CharhighSurface[x, y] = colors[1];
			// else this.CharhighSurface[x,y] = transparent;

			this.CharlowSurface [x, y] = colors[(this.ArgSurface[x,y-y%8].B & 3)];
			this.CharhighSurface[x, y] = colors[(this.ArgSurface[x,y-y%8].B & 12)>>2];

			uint colors0 = this.CharlowSurface[x,y-y%8].Bgra;
			uint colors1 = this.CharhighSurface[x,y-y%8].Bgra;

			uint faultycolor = ColorBgra.FromBgra(0,0,255,255).Bgra;
			ColorBgra c0 = this.CharlowSurface [x, y-y%8];
			ColorBgra c1 = this.CharhighSurface[x, y-y%8];

			unsafe
			{
				for(y = 0; y<8; y++)
				{
					ColorBgra *srcPtr = src.GetPointAddress(srcOffset.X, srcOffset.Y + y);
					ColorBgra *dstPtr = dst.GetPointAddress(srcOffset.X, srcOffset.Y + y);

					for(x=0; x<8; x++)
					{
						if(srcPtr->A < 255 || (srcPtr->Bgra != colors0 && srcPtr->Bgra != colors1))
						{
							if(autofix)
								dstPtr->Bgra = ColorBgra.closest2(*srcPtr, c0, c1).Bgra;
							else
								dstPtr->Bgra = faultycolor;
						}

						if(addtransparency && dstPtr->A == 255 && srcPtr->Bgra == colors0)
						{
							dstPtr->A = 0;
						}

						srcPtr++;
						dstPtr++;
					}
				}
			}
		}

		void RestrictToKoalaHigherChars(Surface dst, Surface src, Point srcOffset, bool autofix, bool addtransparency)
		{
			int x, y, i;
			int numcolors;
			ColorBgra[] colors;

			colors = new ColorBgra[64];
			numcolors = 0;

			unsafe
			{
				for(y = 0; y<8; y++)
				{
					ColorBgra *srcPtr = src.GetPointAddress(srcOffset.X, srcOffset.Y + y);

					for(x=0; x<8; x++)
					{
						if(srcPtr->A != 0)
						{
							for(i = 0; i < numcolors; i++)
							{
								if(	colors[i].R == srcPtr->R &&
									colors[i].G == srcPtr->G &&
									colors[i].B == srcPtr->B)
								{
									// we keep track of the number of occurances in the alpha channel...
									// make sure they get put back to 255 later
									colors[i].A += 1;
									break;
								}
							}

							// oops, this is a new color... add to array
							if(i == numcolors)
							{
								colors[i] = *srcPtr;
								colors[i].A = 1;
								numcolors++;
							}
						}
						srcPtr++;
					}
				}
			}

			// find most present color in char
			int highestoccurance = 0;
			for(i=1; i<numcolors; i++)
				if(colors[i].A > colors[highestoccurance].A)
					highestoccurance = i;

			if(colors[0] != colors[highestoccurance])
			{
				ColorBgra tempcolor = colors[highestoccurance];
				for(i=highestoccurance; i>0; i--)
					colors[i] = colors[i-1];
				colors[0] = tempcolor;
			}

			// find second most present color in char
			highestoccurance = 1;
			for(i=2; i<numcolors; i++)
				if(colors[i].A > colors[highestoccurance].A)
					highestoccurance = i;

			if(colors[1] != colors[highestoccurance])
			{
				ColorBgra tempcolor = colors[highestoccurance];
				for(i=highestoccurance; i>1; i--)
					colors[i] = colors[i-1];
				colors[1] = tempcolor;
			}

			// find third most present color in char
			highestoccurance = 2;
			for(i=3; i<numcolors; i++)
				if(colors[i].A > colors[highestoccurance].A)
					highestoccurance = i;

			if(colors[2] != colors[highestoccurance])
			{
				ColorBgra tempcolor = colors[highestoccurance];
				for(i=highestoccurance; i>2; i--)
					colors[i] = colors[i-1];
				colors[2] = tempcolor;
			}

			// done
			colors[0].A = 255;
			colors[1].A = 255;
			colors[2].A = 255;

			if(numcolors < 1) colors[0] = ColorBgra.FromBgra(0, 0, 0, 0);
			if(numcolors < 2) colors[1] = ColorBgra.FromBgra(0, 0, 0, 0);
			if(numcolors < 3) colors[2] = ColorBgra.FromBgra(0, 0, 0, 0);

			x = srcOffset.X/8;
			y = srcOffset.Y; // this is snapped to 0,8,16 etc. because we're checking chars, not lines

			this.ColorSurface   [x, y/8] = colors[(this.ArgSurface[x,y].B & 3)];
			this.CharlowSurface [x, y  ] = colors[(this.ArgSurface[x,y].B & 12)>>2];
			this.CharhighSurface[x, y  ] = colors[(this.ArgSurface[x,y].B & 48)>>4];

			uint colors0 = this.ColorSurface   [x, y/8].Bgra;
			uint colors1 = this.CharlowSurface [x, y  ].Bgra;
			uint colors2 = this.CharhighSurface[x, y  ].Bgra;

			ColorBgra c0 = this.ColorSurface   [x, y/8];
			ColorBgra c1 = this.CharlowSurface [x, y  ];
			ColorBgra c2 = this.CharhighSurface[x, y  ];

			uint faultycolor = ColorBgra.FromBgra(0,0,255,255).Bgra;

			unsafe
			{
				for(y = 0; y<8; y++)
				{
					ColorBgra *srcPtr = src.GetPointAddress(srcOffset.X, srcOffset.Y + y);
					ColorBgra *dstPtr = dst.GetPointAddress(srcOffset.X, srcOffset.Y + y);

					for(x=0; x<8; x++)
					{
						if(srcPtr->A != 0)
						{
							if(srcPtr->Bgra != colors0 && srcPtr->Bgra != colors1 && srcPtr->Bgra != colors2)
							{
								if(autofix)
									dstPtr->Bgra = ColorBgra.closest3(*srcPtr, c0, c1, c2).Bgra;
								else
									dstPtr->Bgra = faultycolor;
							}
						}
						srcPtr++;
						dstPtr++;
					}
				}
			}
		}


		// HACK, next function converts to indexed color
		void IndexColors(Surface dst, Surface src, Point srcOffset, Size roiSize)
		{
			Rectangle srcRect = new Rectangle(srcOffset, roiSize);
			Rectangle srcClip = Rectangle.Intersect(srcRect, src.Bounds);
			Point topleftpoint = new Point(0,0);

			if (srcRect != srcClip)
			{
				throw new ArgumentOutOfRangeException("roiSize", "Source roi out of bounds");
			}

			int width = roiSize.Width + srcOffset.X%8;
			if(width%8 != 0) width += 8 - width%8;
			srcOffset.X -= srcOffset.X%8;

			int height = roiSize.Height + srcOffset.Y%8;
			if(height%8 != 0) height += 8 - height%8;
			srcOffset.Y -= srcOffset.Y%8;

			unsafe
			{
				for (int row = 0; row < height; ++row)
				{
					ColorBgra *srcPtr = src.GetPointAddress(srcOffset.X, srcOffset.Y + row);

					int length = width;

					while (length > 0)
					{
						*srcPtr = ColorBgra.CalcRampQuickStable(*srcPtr);
						++srcPtr;
						--length;
					}
				}
			}
		}

		void RestrictColors(Surface dst, Surface src, Point srcOffset, Size roiSize, bool fixclashes, bool addtransparency)
		{
			Rectangle srcRect = new Rectangle(srcOffset, roiSize);
			Rectangle srcClip = Rectangle.Intersect(srcRect, src.Bounds);
			Point topleftpoint = new Point(0,0);

			if (srcRect != srcClip)
			{
				throw new ArgumentOutOfRangeException("roiSize", "Source roi out of bounds");
			}

			int width = roiSize.Width + srcOffset.X%8;
			if(width%8 != 0) width += 8 - width%8;
			srcOffset.X -= srcOffset.X%8;

			int height = roiSize.Height + srcOffset.Y%8;
			if(height%8 != 0) height += 8 - height%8;
			srcOffset.Y -= srcOffset.Y%8;

			unsafe
			{
				for (int row = 0; row < height; ++row)
				{
					int length = width;

					while (length > 0)
					{
						if((width - length)%8 == 7 && (srcOffset.Y + row)%8 == 7)
						{
							topleftpoint.X = srcOffset.X + (width - length - 7);
							topleftpoint.Y = srcOffset.Y + row - 7;
							Type rm = this.properties.restrictMode.GetType();

							     if(rm == typeof(RestrictModes.KoalaRestrictMode))				RestrictToKoalaHigherChars(dst, src, topleftpoint, fixclashes, addtransparency);
							else if(rm == typeof(RestrictModes.AFLI4SpriteMultiRestrictMode))	RestrictToKoalaHigherChars(dst, src, topleftpoint, fixclashes, addtransparency);
							else if(rm == typeof(RestrictModes.SpriteMultiRestrictMode))		RestrictToKoalaHigherChars(dst, src, topleftpoint, fixclashes, addtransparency);
							else if(rm == typeof(RestrictModes.SpriteSingleRestrictMode))		RestrictToArtStudioHigherChars(dst, src, topleftpoint, fixclashes, addtransparency);
							else if(rm == typeof(RestrictModes.ArtStudioRestrictMode))			RestrictToArtStudioHigherChars(dst, src, topleftpoint, fixclashes, addtransparency);
							else if(rm == typeof(RestrictModes.FLI8RestrictMode))				RestrictToFLI8Chars(dst, src, topleftpoint, fixclashes, addtransparency);
							else if(rm == typeof(RestrictModes.AFLI8RestrictMode))				RestrictToAFLI8Chars(dst, src, topleftpoint, fixclashes, addtransparency);
							else if(rm == typeof(RestrictModes.AFLI4RestrictMode))				RestrictToAFLI4Chars(dst, src, topleftpoint, fixclashes, addtransparency);
						}

						--length;
					}
				}
			}
		}

		// HACK, next function converts to double pixels
		void DoublePixels(Surface src, Point srcOffset, Size roiSize)
		{
			Rectangle srcRect = new Rectangle(srcOffset, roiSize);
			Rectangle srcClip = Rectangle.Intersect(srcRect, src.Bounds);

			if (srcRect != srcClip)
			{
				throw new ArgumentOutOfRangeException("roiSize", "Source roi out of bounds");
			}

			int width = roiSize.Width;
			int height = roiSize.Height;

			unsafe
			{
				for (int row = 0; row < roiSize.Height; ++row)
				{
					ColorBgra *srcPtr = src.GetPointAddress(srcOffset.X - srcOffset.X%2, srcOffset.Y + row);

					int length = (width+srcOffset.X%2) / 2;
					while (length > 0)
					{
						uint original = srcPtr->Bgra;

						++srcPtr;
						srcPtr->Bgra = original;
						++srcPtr;
						--length;
					}
				}
			}
		}

		protected override void RenderImpl(RenderArgs args, Rectangle roi)
		{
			if (disposed)
			{
				throw new ObjectDisposedException("BitmapLayer");
			}

			if (Opacity == 0)
			{
				return;
			}

			if (compiledBlendOp == null)
			{
				CompileBlendOp();
			}

			// HACK, we need to do that double pixel converting here first
			if(this.IsIndexedColor && this.properties.restrictMode.IsDoublePixel())
				DoublePixels(this.Surface, roi.Location, roi.Size);

			if(this.IsIndexedColor)
				IndexColors(args.Surface, this.Surface, roi.Location, roi.Size);

			if(properties.blendOp.GetType() == typeof(UserBlendOps.SpriteBlendOp))
			{
				if(this.IsIndexedColor)
					RestrictColors(args.Surface, this.Surface, roi.Location, roi.Size, this.IsFixClashes, true);

				compiledBlendOp.Apply(args.Surface, roi.Location, this.Surface, roi.Location, roi.Size);
			}
			else
			{
				compiledBlendOp.Apply(args.Surface, roi.Location, this.Surface, roi.Location, roi.Size);

				if(this.IsIndexedColor) // LOOK AT THE COMMENT IN FLI8CHARS RESTRICTMODE!!!
					RestrictColors(args.Surface, this.Surface, roi.Location, roi.Size, this.IsFixClashes, false);
			}
		}

        public override PdnBaseForm CreateConfigDialog()
        {
            BitmapLayerPropertiesDialog blpd = new BitmapLayerPropertiesDialog();
            blpd.Layer = this;
            return blpd;
        }

        #region IDeserializationCallback Members

        public void OnDeserialization(object sender)
        {
            if (this.properties.opacity != -1)
            {
                this.PushSuppressPropertyChanged();
                base.Opacity = (byte)this.properties.opacity;
                this.properties.opacity = -1;
                this.PopSuppressPropertyChanged();
            }
        }

        #endregion
    }
}
