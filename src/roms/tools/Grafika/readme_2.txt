Pixel Perfect v1.0 by Clarence/Chorus
Release date: 2007.10.15.

Introduction:
-------------
It's an Interlace-FLI editor for the Commodore 64. Intented to be used on the
real hardware for hardcore pixel artists of the C64 scene! The reason behind
this release is: even though emulators and superior pc drawing tools are
all around, the interlace mode of the C64 still cannot be emulated 
perfectly on a PC, the color blending is far from perfect. Existing C64 ifli
tools are slow, unreliable, buggy and unfriendly according to experienced 
graphician friends (Leon, Jailbird, Poison). So my fellow Hungarians 
persuaded me to make this tool. Hereby I dedicate Pixel Perfect for them!

Credits:
--------
Programming: Clarence of Chorus (e-mail: clarence at freemail dot hu)
Idea: Leon of Chorus/Singular Crew, Jailbird of Booze Design
Testing, demo picture included on disk: Leon of Chorus/Singular Crew
Ide64 help: Soci of Singular Crew, Poison of Singular Crew
1541 turbo loader/saver: Explorer of Agony Design

Features:
---------
-Importing Funpaint, Gunpaint or Drazlace pics (non-packed versions).
-Own Packed (.PPP)/Unpacked file format(.PP).
-Using turbo load/save routine when using an 1541 compatible drive as unit 8.
-Formatting disk if you run out of disk space.
-Support for Ide64.
-Undo/Redo in zoomeditor mode.
-Ditherfill char.
-Move picture.
-Perfect 200 lines ifli displayer.
-You can save your pic as a runnable (.PPE) file and continue using 
the editor. The file is however unpacked (136 blocks). It's recommmended
to use external cruncher program afterwards to shorten it. Start address 
is $081c (sys 2076).
-Experimental C=1351 mouse support (tested only under the Vice emulator 
since I don't have the hardware yet).
-Exporting to Funpaint format.

ZOOM EDITOR:
------------

There are three simultaneous input methods for drawing, choose one:
1. Joy in port II.
2. Cursor keys/Space/Inst del: Move drawing cursor/Set a pixel/Clear a pixel.
3. C= 1351 mouse in port I, left button set, right button clear a pixel.

- HOTKEYS:

C= + Shift + Home: Clear entire pic, you will be asked for confirmation on
the lower right corner, press Y or N. This operation cannot be undone.

<- (left arrow): show the picture in fullscreen.

Shift+Z/Z: Undo/Redo changes, 64 steps!

=/Return: Copy current char to buffer/Paste char from buffer.

1,2,...8: Choose a color from black to yellow
Shift+1,2,...8 or Q,W,...I: choose a color from orange to light gray.

Inst del: Clear current pixel.

Home: Clear current char.

Shift+Home: Clear current char's actual row.

D: Ditherfill current char.

,/.: Set actual color to ditherfill color1/color2 (color1 will be the color
of the left-upper corner in the ditherfilled char).

^ (arrow up): Toggle between grid modes char grid/pixel grid/no grid.

*/Shift+*: Increase/decrease grid color.

@/Shift+ @: Increase/decrease the zoomeditor border color.

+/-: Increase/decrease input speed, the speed is indicated in the lower-right
corner with an inverted number, 1 is fastest, 9 is slowest. Input speed
doesn't affect the mouse input.

B: Actual color to background color.

F1/F3: Move cursor left/right by a character.
Shift+F1/F3: Move cursor to middle of the pic then to the border of pic 
horizontally.

F5/F7: Move cursor up/down by a character.
Shift+F5/F7: Move cursor to middle of the pic then to the border of pic 
vertically.

H: Show help.

Run stop: Exit to Main Menu. The undo buffer will be lost.

- IN FULLSCREEN VIEW MODE (<-):

Use cursor keys to scroll the picture around by a character. If you do so,
note that the undo buffer will be lost.

C=: Flashes actual cursor position.

Run stop or Space: Back to zoomeditor.


OTHER INFO:
-----------

- The unpacked Pixel Perfect (.PP) format description:

  $3c00-$4000	$d800 memory
  $4000-$6000	color memory 1
  $6000-$7f40	bitmap 1
  $7f7f		background color
  $8000-$a000	color memory 2
  $a000-$bf40	bitmap 2

Have a good time pixelling!

/Clarence of Chorus