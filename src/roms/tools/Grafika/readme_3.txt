

Project One 
-----------


(aka. "save often, you have been warned" :)




INSTALLATION
------------

copy all non .exe files from the .zip to your c:\windows\system32\.
Copy ProjectOne.exe where you want it to be and start it up.


CHOOSING COLORS
---------------

- Click on the palette colors with left mouse button to choose a color for the left mouse button.
Same applies to the right mouse button.

- shift/ctrl+mousewheel in the active zoom window

- Also u can use the keys 1-9, q-i to select colors for the left mouse button.


SETTING PIXELS
--------------

left/right mouse button:set pixel with color assigned to left/right button

shift+left/right button: pick up color under cursor

alt + left/right button: draw in dither mode (select 2 color for left/right, then try and see)

ctrl+ left/right button: replace color under cursor inside character under cursor

The middle button is to paint with the background color. (in another word to clear pixels)


KEYBOARD
--------

make sure zoom window is active.

space: clear pixel. (paint with background color)

backspace: fill character under cursor with left button color

b: press this key to change the background color (non background pixels having the color of the new background will be treated as background after this, be careful)


Navigation:
-----------

hold ctrl then click into the display window and drag the mouse around to move the zoom window location.

use the mousewheel to change zoom ratio of zoom/display window.
hold ctrl to prevent the auto resize of the display window.

you can use the cursor keys to move the zoom window, or use the sliders, or u can click inside
the view window and drag the mouse around.

GUI
---

the colors used in the character under the cursor are displayed at the statusbar.

However in FLI modes you can see there the colors used in the actual fli line. In interlaced modes things gets yet more complicated, as there's a different screen assigned to odd and even X coordinates. But this is not as complicated as it sounds.


menus
-----

file
load: loads&converts a gif/jpg/bmp picture (see convert)
save: saves your picture in windows .bmp format

load koala: loads a koala pic (c64format). extension must be .kla
save koala: saves a koala pic (c64format) 

load drazlace: load unpacked c64 drazlace file
save drazlace: save unpacked c64 drazlace file

load/save ifli: guess

exit: guess

options

fillmode
strict: avoids breaking currrent mode's color limitations
compensating: searches for the best solution to fill.
ditherfill: fills in chessboard stlye with left and right mousebutton colors

note that ufli is unfinished, you can only load into the format, or switch into it.

drazlace(2screenmem) is a special drazlace mode where the 2 interlaced koala pic use 2 different screenmem.

clipboard
copy
paste

the above should speak for itself.

CONVERTER
---------

You can load/paste any gif/jpg/bmp with any color depth/size. Be careful. Incorrect picture files WILL CRASH the editor. 


convert options
---------------

any picture loaded or pasted from clipboard will be converted using these settings. Only native c64 formats wont get converted. (koala and drazlace so far)

resolution reduction:

the resolution must be halved horizontally to match the size of the c64 multicolor pixels. You can decide
how to do this:

pixels from left: from each 2 pixel uses the color of the pixel on left.
pixels from right: vice versa the above
average: averages the color of the 2 pixel's.

Background:

Optimized: this one will convert the picture 16 times, to check the resulting pixel loss with each possible background color. The final background will be which has the least pixel loss.

Most freq. col.: uses the most used color for background.

User defined: guess.

Colors inside char:

Most freq 3.: uses the 3 most used color inside a character. the rest of the colors in the char will be matched to these 3.

Optimized: checks for all possible color combinations inside a char, and chooses which generates the least pixel loss.

use background to fix color clash bugs: wether to use or not background color for a pixel which cannot hold it's original color due to color limits.

force greys: this was invented after realizing that some grey shades are often closer to color $0d than $0f (and some to $09). this option forces grey colors to stay grey. Treshold controls that how big difference in a colors R G and B will be threated as grey.

uniform dither: converts the original into a dithered picture with a uniform palette. Then converts the colors into c64 colors.Treshold controls here the amount of colors in the uniform palette. 1=256, 128=4.

avg dither: searches for 2 c64 colors which matches the original color so that their RGB average is the closest possible to the original.

stretch to fit: stretches the picture to fit the c64 screen.

keep aspect: makes sure that the original aspect ratio is kept after stretch.

CUSTOM PALETTE
--------------

Place a text file called "default.txt" into the directory where the .exe resides. Upon startup the
program will find it and read the colors from it. If this file does not exist it will use pepto's
palette automagically.

the file should look like this:

(this one uses pepto's palette)

0, 0, 0
255, 255, 255
104, 55, 43
112, 164, 178
111, 61, 134
88, 141, 67
53, 40, 121
184, 199, 111
111, 79, 37
67, 57, 0
154, 103, 89
68, 68, 68
108, 108, 108
154, 210, 132
108, 94, 181
149, 149, 149

there can be no empty lines before the first entry and lines after the last one will be ignored.
You can also use HEX entries with the &H prefix.

Please notice, that the parser is NOT idiot proof. A missing "," etc might give unpredictable results.


CHANGES
-------


21.03.2005

- first release.

24.03.2005

- customizable palette. 
- owerwrite of koala files now works.
- undo function removed till it will be really functional. (and bugfree)
- update view button added.
- background changing debugged.
- misc bugfixes.

17.06.2005

- Lots of bugs fixed, and new ones added.
- New gfx modes: hires,drazlace,fli,ifli,afli, etc.
- Refined converter, new convert options
- Can convert to all editable modes
- Native c64 format save/load for koala/drazlace (more later)
- Separate view window with ability to zoom,resize, interlace emulation.
- Zoom rate adjustable in edit window
- and a lot which I cant remember now.

23.10.2005.

- c64 memory model completely recoded, crashes when pixeling must be gone
- 16 level undo / redo
- mousewheel support to change zoom ratio, colors, etc
- hue,saturation,lightness, contrast adjustable
- preview pic in convert options
- intuitive navigation in display/zoom window
- char/pixel grid auto hide at user set level
- zoom window resize debugged, now can show zoom levels 1:1 - 1:16
- toolbar
- is now an mdi form
- statusbar
- palette window

KNOWN BUGS
----------

- crashes when loading invalid picture files (jpg/bmp etc)
- when saving c64 format the current format is not validated (so you can save ifli to koala, which leads to god knows what)
- when loading c64 format pic, no checks are done to validate the picture as a valid c64 pic.
- interlace emulation doesnt checks if the current mode is interlaced or not.


FEEDBACK
--------

Any feedback/error report is warmly welcome. If you feel like you can write to oswald@c64.rulez.org. Thank you!
