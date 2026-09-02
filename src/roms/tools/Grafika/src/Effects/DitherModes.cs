using System;
using System.Collections;
using System.Reflection;

namespace PaintDotNet
{
    public sealed class DitherModes
    {
        private DitherModes()
        {
        }

        public static Type[] GetDitherModes()
        {
            Type[] allTypes = typeof(DitherModes).GetNestedTypes();
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

		public static DitherMode CreateDitherMode(Type DitherType)
		{
			ConstructorInfo ci = DitherType.GetConstructor(System.Type.EmptyTypes);
			DitherMode mode = (DitherMode)ci.Invoke(null);
			return mode;
		}

		public static DitherMode CreateDefaultDitherMode()
		{
			return new Checker3OddDitherMode();
		}

		public static Type GetDefaultDitherMode()
		{
			return typeof(Checker3OddDitherMode);
		}

		[Serializable]
			public sealed class NoDitherMode
			: DitherMode
		{
			public static string StaticName
			{
				get
				{
					return "none";
				}
			}

			public static int IndexNumber
			{
				get
				{
					return 0;
				}
			}

			public NoDitherMode()
			{
			}
		}

		[Serializable]
		public sealed class Checker1OddDitherMode
			: DitherMode
		{
			public static string StaticName
			{
				get
				{
					return "2x2 checker Odd";
				}
			}

			public static int IndexNumber
			{
				get
				{
					return 1;
				}
			}

			public Checker1OddDitherMode()
			{
			}
		}
		
		[Serializable]
			public sealed class Checker1EvenDitherMode
			: DitherMode
		{
			public static string StaticName
			{
				get
				{
					return "2x2 checker Even";
				}
			}

			public static int IndexNumber
			{
				get
				{
					return 2;
				}
			}

			public Checker1EvenDitherMode()
			{
			}
		}
		
		[Serializable]
		public sealed class Checker3OddDitherMode
			: DitherMode
		{
			public static string StaticName
			{
				get
				{
					return "4x4 checker Odd";
				}
			}

			public static int IndexNumber
			{
				get
				{
					return 3;
				}
			}

			public Checker3OddDitherMode()
			{
			}
		}

		[Serializable]
			public sealed class Checker3EvenDitherMode
			: DitherMode
		{
			public static string StaticName
			{
				get
				{
					return "4x4 checker Even";
				}
			}

			public static int IndexNumber
			{
				get
				{
					return 4;
				}
			}

			public Checker3EvenDitherMode()
			{
			}
		}

		[Serializable]
        public sealed class Horizontal1OddDitherMode
			: DitherMode
        {
            public static string StaticName
            {
                get
                {
                    return "Horizontal lines Odd";
                }
            }

			public static int IndexNumber
			{
				get
				{
					return 5;
				}
			}

            public Horizontal1OddDitherMode()
            {
            }
        }

		[Serializable]
			public sealed class Horizontal1EvenDitherMode
			: DitherMode
		{
			public static string StaticName
			{
				get
				{
					return "Horizontal lines Even";
				}
			}

			public static int IndexNumber
			{
				get
				{
					return 6;
				}
			}

			public Horizontal1EvenDitherMode()
			{
			}
		}
	}
}
