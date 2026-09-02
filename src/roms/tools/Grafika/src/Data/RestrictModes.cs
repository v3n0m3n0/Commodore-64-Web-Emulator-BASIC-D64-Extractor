using System;
using System.Collections;
using System.Reflection;

namespace PaintDotNet
{
    public sealed class RestrictModes
    {
        private RestrictModes()
        {
        }

        public static Type[] GetRestrictModes()
        {
            Type[] allTypes = typeof(RestrictModes).GetNestedTypes();
            ArrayList types = new ArrayList(allTypes.Length);

            foreach (Type type in allTypes)
            {
                if (!type.IsAbstract)
                {
                    types.Add(type);
                }
            }

            return (Type[])types.ToArray(typeof(Type));
        }

		public static RestrictMode CreateRestrictMode(Type restrictType)
		{
			ConstructorInfo ci = restrictType.GetConstructor(System.Type.EmptyTypes);
			RestrictMode mode = (RestrictMode)ci.Invoke(null);
			return mode;
		}

		public static RestrictMode CreateDefaultRestrictMode()
		{
			return new NormalRestrictMode();
		}

		public static Type GetDefaultRestrictMode()
		{
			return typeof(NormalRestrictMode);
		}

		[Serializable]
		public sealed class NormalRestrictMode
			: RestrictMode
		{
			public static string StaticName
			{
				get
				{
					return "Unrestricted single pixel";
				}
			}

			public static bool DoublePixel
			{
				get
				{
					return false;
				}
			}

			public NormalRestrictMode()
			{
			}
		}
		
		[Serializable]
		public sealed class NormalDoubleRestrictMode
			: RestrictMode
		{
			public static string StaticName
			{
				get
				{
					return "Unrestricted double pixel";
				}
			}

			public static bool DoublePixel
			{
				get
				{
					return true;
				}
			}

			public NormalDoubleRestrictMode()
			{
			}
		}

		[Serializable]
        public sealed class KoalaRestrictMode
			: RestrictMode
        {
            public static string StaticName
            {
                get
                {
                    return "Hires multicolor";
                }
            }

			public static bool DoublePixel
			{
				get
				{
					return true;
				}
			}

            public KoalaRestrictMode()
            {
            }
        }

		[Serializable]
			public sealed class ArtStudioRestrictMode
			: RestrictMode
		{
			public static string StaticName
			{
				get
				{
					return "Hires singlecolor";
				}
			}

			public static bool DoublePixel
			{
				get
				{
					return false;
				}
			}

			public ArtStudioRestrictMode()
			{
			}
		}

		[Serializable]
			public sealed class SpriteSingleRestrictMode
			: RestrictMode
		{
			public static string StaticName
			{
				get
				{
					return "Sprites singlecolor";
				}
			}

			public static bool DoublePixel
			{
				get
				{
					return false;
				}
			}

			public SpriteSingleRestrictMode()
			{
			}
		}

		[Serializable]
			public sealed class SpriteMultiRestrictMode
			: RestrictMode
		{
			public static string StaticName
			{
				get
				{
					return "Sprites multicolor";
				}
			}

			public static bool DoublePixel
			{
				get
				{
					return true;
				}
			}

			public SpriteMultiRestrictMode()
			{
			}
		}

		[Serializable]
			public sealed class AFLI4SpriteMultiRestrictMode
			: RestrictMode
		{
			public static string StaticName
			{
				get
				{
					return "AFLI4 Sprites multicolor";
				}
			}

			public static bool DoublePixel
			{
				get
				{
					return true;
				}
			}

			public AFLI4SpriteMultiRestrictMode()
			{
			}
		}

		[Serializable]
		public sealed class FLI8RestrictMode
			: RestrictMode
		{
			public static string StaticName
			{
				get
				{
					return "FLI every line";
				}
			}

			public static bool DoublePixel
			{
				get
				{
					return true;
				}
			}

			public FLI8RestrictMode()
			{
			}
		}

		[Serializable]
		public sealed class AFLI8RestrictMode
			: RestrictMode
		{
			public static string StaticName
			{
				get
				{
					return "AFLI every line";
				}
			}

			public static bool DoublePixel
			{
				get
				{
					return false;
				}
			}

			public AFLI8RestrictMode()
			{
			}
		}

		[Serializable]
			public sealed class AFLI4RestrictMode
			: RestrictMode
		{
			public static string StaticName
			{
				get
				{
					return "AFLI every 2 lines";
				}
			}

			public static bool DoublePixel
			{
				get
				{
					return false;
				}
			}

			public AFLI4RestrictMode()
			{
			}
		}

	}
}
