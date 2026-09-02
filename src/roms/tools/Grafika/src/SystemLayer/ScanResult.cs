using System;

namespace PaintDotNet.SystemLayer
{
    /// <summary>
    /// Defines the possible results when scanning.
    /// </summary>
    public enum ScanResult
    {
        /// <summary>
        /// The operation completed successfully.
        /// </summary>
        Success,

        /// <summary>
        /// The user cancelled the operation.
        /// </summary>
        UserCancelled,

        /// <summary>
        /// The device was busy or otherwise inaccessible.
        /// </summary>
        DeviceBusy
    }
}
