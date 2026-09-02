using System;

namespace PaintDotNet
{
    /// <summary>
    /// Summary description for SaveConfigToken.
    /// </summary>
    [Serializable]
    public class SaveConfigToken
        : ICloneable
    {
        #region ICloneable Members
        /// <summary>
        /// This should simply call "new myType(this)" ... do not call base class'
        /// implementation of Clone, as this is handled by the constructors.
        /// </summary>
        public virtual object Clone()
        {
            return new SaveConfigToken(this);
        }
        #endregion
        
        public SaveConfigToken()
        {
        }

        protected SaveConfigToken(SaveConfigToken copyMe)
        {
        }
    }
}

