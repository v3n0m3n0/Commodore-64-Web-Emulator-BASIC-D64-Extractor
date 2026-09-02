using System;

namespace PaintDotNet.Effects
{
	/// <summary>
	/// Tags an effect with a specific EffectTypeHint.
	/// </summary>
	public class EffectTypeHintAttribute
        : Attribute
	{
        private EffectTypeHint effectTypeHint;
        public EffectTypeHint EffectTypeHint
        {
            get
            {
                return effectTypeHint;
            }
        }

		public EffectTypeHintAttribute(EffectTypeHint effectTypeHint)
		{
            this.effectTypeHint = effectTypeHint;
		}
	}
}
