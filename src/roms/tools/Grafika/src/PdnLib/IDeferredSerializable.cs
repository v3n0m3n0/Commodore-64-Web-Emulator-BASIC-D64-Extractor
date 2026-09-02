using System;
using System.IO;
using System.Runtime.Serialization;

namespace PaintDotNet
{
	/// <summary>
	/// Summary description for IDeferredSerializable.
	/// </summary>
	public interface IDeferredSerializable
        : ISerializable
	{
        void FinishSerialization(Stream output, DeferredFormatter context);
        void FinishDeserialization(Stream input, DeferredFormatter context);
	}
}
