import React from "react";

export type PetsciiGlyphType =
  | "chk_4x4"
  | "cross_box"
  | "cross_plus"
  | "vert_split"
  | "vert_line_split"
  | "stipple_3dots"
  | "tri_top_right"
  | "tri_top_left"
  | "tri_bottom_left"
  | "tri_bottom_right"
  | "circle_in_square"
  | "solid_circle"
  | "open_circle"
  | "target_circle"
  | "t_down"
  | "t_up"
  | "t_right"
  | "t_left"
  | "bar_top"
  | "bar_bottom"
  | "bar_left"
  | "bar_right"
  | "bar_double_h"
  | "bar_double_v"
  | "bar_mid_h"
  | "bar_mid_v"
  | "block_bottom_half"
  | "block_top_half"
  | "block_left_half"
  | "block_right_half"
  | "arc_top_right"
  | "arc_bottom_right"
  | "arc_top_left"
  | "arc_bottom_left"
  | "quad_tl"
  | "quad_tr"
  | "quad_bl"
  | "quad_br"
  | "square_outline"
  | "spade"
  | "heart"
  | "diamond"
  | "club"
  | "angle_bottom_right"
  | "angle_top_left"
  | "checker_tl_br"
  | "checker_tr_bl"
  | "slash"
  | "backslash"
  | "cross_x"
  | "rect_open"
  | "rect_solid"
  | "cbm_logo";

interface PetsciiIconProps {
  glyph: PetsciiGlyphType;
  className?: string;
  size?: number;
}

export const PetsciiIcon: React.FC<PetsciiIconProps> = ({
  glyph,
  className = "",
  size = 14,
}) => {
  const commonSvgProps = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    className: `inline-block shrink-0 ${className}`,
    fill: "currentColor",
  };

  switch (glyph) {
    // 4x4 Checkerboard Grid
    case "chk_4x4":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="0" width="4" height="4" />
          <rect x="8" y="0" width="4" height="4" />
          <rect x="4" y="4" width="4" height="4" />
          <rect x="12" y="4" width="4" height="4" />
          <rect x="0" y="8" width="4" height="4" />
          <rect x="8" y="8" width="4" height="4" />
          <rect x="4" y="12" width="4" height="4" />
          <rect x="12" y="12" width="4" height="4" />
        </svg>
      );
    case "cross_box":
    case "cross_plus":
      return (
        <svg {...commonSvgProps}>
          <rect x="6.5" y="0" width="3" height="16" />
          <rect x="0" y="6.5" width="16" height="3" />
        </svg>
      );
    case "vert_split":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="0" width="8" height="16" />
          <rect x="8" y="0" width="8" height="16" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      );
    case "vert_line_split":
      return (
        <svg {...commonSvgProps}>
          <rect x="6.5" y="0" width="3" height="16" />
        </svg>
      );
    case "stipple_3dots":
      return (
        <svg {...commonSvgProps}>
          <rect x="2" y="11" width="3" height="3" />
          <rect x="6.5" y="6.5" width="3" height="3" />
          <rect x="11" y="2" width="3" height="3" />
        </svg>
      );
    case "tri_top_right":
      return (
        <svg {...commonSvgProps}>
          <polygon points="0,0 16,0 16,16" />
        </svg>
      );
    case "tri_top_left":
      return (
        <svg {...commonSvgProps}>
          <polygon points="0,0 16,0 0,16" />
        </svg>
      );
    case "tri_bottom_left":
      return (
        <svg {...commonSvgProps}>
          <polygon points="0,0 0,16 16,16" />
        </svg>
      );
    case "tri_bottom_right":
      return (
        <svg {...commonSvgProps}>
          <polygon points="16,0 16,16 0,16" />
        </svg>
      );

    // Circles & Shapes
    case "circle_in_square":
      return (
        <svg {...commonSvgProps}>
          <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="3.5" />
        </svg>
      );
    case "solid_circle":
      return (
        <svg {...commonSvgProps}>
          <circle cx="8" cy="8" r="6" />
        </svg>
      );
    case "open_circle":
      return (
        <svg {...commonSvgProps}>
          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      );
    case "target_circle":
      return (
        <svg {...commonSvgProps}>
          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="8" cy="8" r="2.2" />
        </svg>
      );

    // T-Junctions
    case "t_down":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="0" width="16" height="3" />
          <rect x="6.5" y="3" width="3" height="13" />
        </svg>
      );
    case "t_up":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="13" width="16" height="3" />
          <rect x="6.5" y="0" width="3" height="13" />
        </svg>
      );
    case "t_right":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="0" width="3" height="16" />
          <rect x="3" y="6.5" width="13" height="3" />
        </svg>
      );
    case "t_left":
      return (
        <svg {...commonSvgProps}>
          <rect x="13" y="0" width="3" height="16" />
          <rect x="0" y="6.5" width="13" height="3" />
        </svg>
      );
    case "cbm_logo":
      return (
        <svg {...commonSvgProps}>
          {/* Commodore stylized C */}
          <path
            d="M 11 2.5 C 5.5 2.5 2 6 2 8 C 2 10 5.5 13.5 11 13.5 L 9 10.5 C 6.5 10.5 4.8 9.2 4.8 8 C 4.8 6.8 6.5 5.5 9 5.5 Z"
          />
          {/* Top flag */}
          <polygon points="10,4.5 15,4.5 13.5,6.5 10,6.5" />
          {/* Bottom flag */}
          <polygon points="10,9.5 13.5,9.5 15,11.5 10,11.5" />
        </svg>
      );

    // Bars
    case "bar_top":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="0" width="16" height="3" />
        </svg>
      );
    case "bar_bottom":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="13" width="16" height="3" />
        </svg>
      );
    case "bar_left":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="0" width="3" height="16" />
        </svg>
      );
    case "bar_right":
      return (
        <svg {...commonSvgProps}>
          <rect x="13" y="0" width="3" height="16" />
        </svg>
      );
    case "bar_double_h":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="2" width="16" height="3" />
          <rect x="0" y="11" width="16" height="3" />
        </svg>
      );
    case "bar_double_v":
      return (
        <svg {...commonSvgProps}>
          <rect x="2" y="0" width="3" height="16" />
          <rect x="11" y="0" width="3" height="16" />
        </svg>
      );
    case "bar_mid_h":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="6.5" width="16" height="3" />
        </svg>
      );
    case "bar_mid_v":
      return (
        <svg {...commonSvgProps}>
          <rect x="6.5" y="0" width="3" height="16" />
        </svg>
      );

    // Halves
    case "block_bottom_half":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="8" width="16" height="8" />
        </svg>
      );
    case "block_top_half":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="0" width="16" height="8" />
        </svg>
      );
    case "block_left_half":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="0" width="8" height="16" />
        </svg>
      );
    case "block_right_half":
      return (
        <svg {...commonSvgProps}>
          <rect x="8" y="0" width="8" height="16" />
        </svg>
      );

    // Arcs
    case "arc_top_right":
      return (
        <svg {...commonSvgProps}>
          <path
            d="M 0 6.5 A 9.5 9.5 0 0 1 9.5 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="square"
          />
        </svg>
      );
    case "arc_bottom_right":
      return (
        <svg {...commonSvgProps}>
          <path
            d="M 9.5 0 A 9.5 9.5 0 0 1 0 9.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="square"
          />
        </svg>
      );
    case "arc_top_left":
      return (
        <svg {...commonSvgProps}>
          <path
            d="M 16 6.5 A 9.5 9.5 0 0 0 6.5 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="square"
          />
        </svg>
      );
    case "arc_bottom_left":
      return (
        <svg {...commonSvgProps}>
          <path
            d="M 6.5 0 A 9.5 9.5 0 0 0 16 9.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="square"
          />
        </svg>
      );

    // Quadrants
    case "quad_tl":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="0" width="8" height="8" />
        </svg>
      );
    case "quad_tr":
      return (
        <svg {...commonSvgProps}>
          <rect x="8" y="0" width="8" height="8" />
        </svg>
      );
    case "quad_bl":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="8" width="8" height="8" />
        </svg>
      );
    case "quad_br":
      return (
        <svg {...commonSvgProps}>
          <rect x="8" y="8" width="8" height="8" />
        </svg>
      );
    case "square_outline":
      return (
        <svg {...commonSvgProps}>
          <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      );

    // Card Suits & Shapes
    case "spade":
      return (
        <svg {...commonSvgProps}>
          <path d="M 8 1 C 5.2 4.2 2 7 2 10.5 C 2 12.8 3.8 14 5.8 14 C 7.2 14 7.8 13.2 8 12.5 C 8.2 13.2 8.8 14 10.2 14 C 12.2 14 14 12.8 14 10.5 C 14 7 10.8 4.2 8 1 Z" />
          <path d="M 7 11.5 L 5.5 15 L 10.5 15 L 9 11.5 Z" />
        </svg>
      );
    case "heart":
      return (
        <svg {...commonSvgProps}>
          <path d="M 8 15 C 8 15 1.5 10 1.5 5.5 C 1.5 3 3.5 1.5 5.5 1.5 C 7 1.5 7.7 2.3 8 3 C 8.3 2.3 9 1.5 10.5 1.5 C 12.5 1.5 14.5 3 14.5 5.5 C 14.5 10 8 15 8 15 Z" />
        </svg>
      );
    case "diamond":
      return (
        <svg {...commonSvgProps}>
          <polygon points="8,1 15,8 8,15 1,8" />
        </svg>
      );
    case "club":
      return (
        <svg {...commonSvgProps}>
          <circle cx="8" cy="5" r="3.5" />
          <circle cx="4.8" cy="9.5" r="3.5" />
          <circle cx="11.2" cy="9.5" r="3.5" />
          <path d="M 7 9 L 5.5 15 L 10.5 15 L 9 9 Z" />
        </svg>
      );
    case "angle_bottom_right":
      return (
        <svg {...commonSvgProps}>
          <path d="M 1 13.5 L 13.5 13.5 L 13.5 1" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
        </svg>
      );
    case "angle_top_left":
      return (
        <svg {...commonSvgProps}>
          <path d="M 15 2.5 L 2.5 2.5 L 2.5 15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
        </svg>
      );
    case "checker_tl_br":
      return (
        <svg {...commonSvgProps}>
          <rect x="0" y="0" width="8" height="8" />
          <rect x="8" y="8" width="8" height="8" />
        </svg>
      );
    case "checker_tr_bl":
      return (
        <svg {...commonSvgProps}>
          <rect x="8" y="0" width="8" height="8" />
          <rect x="0" y="8" width="8" height="8" />
        </svg>
      );
    case "slash":
      return (
        <svg {...commonSvgProps}>
          <line x1="1" y1="15" x2="15" y2="1" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
        </svg>
      );
    case "backslash":
      return (
        <svg {...commonSvgProps}>
          <line x1="1" y1="1" x2="15" y2="15" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
        </svg>
      );
    case "cross_x":
      return (
        <svg {...commonSvgProps}>
          <line x1="1" y1="1" x2="15" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
          <line x1="15" y1="1" x2="1" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
        </svg>
      );
    case "rect_open":
      return (
        <svg {...commonSvgProps}>
          <rect x="2" y="1" width="12" height="14" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "rect_solid":
      return (
        <svg {...commonSvgProps}>
          <rect x="2" y="1" width="12" height="14" />
        </svg>
      );
    default:
      return null;
  }
};
