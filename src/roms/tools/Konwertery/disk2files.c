#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "scan.h"

/******************************************************************
* Disk2Files - Extracts files from 1541 disk images
*
* Marko Mäkelä
* Mail:     Sillitie 10 A
*           01480 Vantaa
*           Finland
* E-Mail:   Marko.Makela@Helsinki.FI
*
* Version history:
*
* Version   Date                Description
* v0.1      August 12th, 1993   Initial version.
* v1.0      August 25th, 1993   First released version.
******************************************************************/

/*********************
* Function prototypes
*********************/

#ifdef __STDC__
int main (int argc, char **argv);
void InitBAM (void);
int AllocBlock (unsigned char track, unsigned char sector);
int ReadBlock (unsigned char *buffer, unsigned char track,
	       unsigned char sector);
void PrintPETSCII (const unsigned char *string, int length);
#else
int main ();
void InitBAM ();
int AllocBlock ();
int ReadBlock ();
void PrintPETSCII ();
#endif

/**********************************
* Global definitions and variables
**********************************/

#define BLOCK_COUNT 683  /* number of blocks on a 1541 disk */
#define TRACK_COUNT 35   /* number of tracks on a 1541 disk */
#define DIR_TRACK 18     /* number of directory track */

unsigned char block_counts[TRACK_COUNT + 1] = {
  0,                                  /* track 0 does not exist */
  21, 21, 21, 21, 21, 21, 21, 21, 21, /* tracks  1 .. 9  */
  21, 21, 21, 21, 21, 21, 21, 21,     /* tracks 10 .. 17 */
  19, 19, 19, 19, 19, 19, 19,         /* tracks 19 .. 24 */
  18, 18, 18, 18, 18, 18,             /* tracks 25 .. 30 */
  17, 17, 17, 17, 17                  /* tracks 31 .. 35 */
};

unsigned char BAM[TRACK_COUNT << 2];  /* Block Availability Map */

FILE *infile;                         /* disk image file */

char *prog;                           /* program name */

/* Main function. */

/* Return codes:
** 0 -- OK
** 1 -- RTFM, error in parameters
** 2 -- error in opening the input file
** 3 -- error in the input file's format
** 4 -- file I/O error
*/

#ifndef __STDC__
int
main (argc, argv)
     int argc;
     char **argv;
#else
int main (int argc, char **argv)
#endif
{
  FILE *outfile;
  unsigned char 
    block[256],         /* for blocks being read from the disk image */
    BAM_block[256],     /* holds the first directory block */
    dir_block[256],     /* holds a block of directory */
    side_sectors[1536]; /* holds side sectors for a file */

  static char *filetypes = "SPUR";

  unsigned int
    uDirCounter,
    uCounter,
    uBlockCount,
    uBlockCounter,
    uIllegalDirBlocks = 0,
    uIllegalFileTypes = 0,
    uIllegalFiles = 0;

  int i = 0, fWarning = 0;

  for (prog = *argv; *prog; prog++);
  for (; prog > *argv && *prog != '/'; prog--);
  if (*prog == '/') prog++;

  argv++;

  if (argc < 2 || argc > 3) {
    fprintf (stderr, "1541 disk image extractor v1.0\n");

    fprintf (stderr, "Usage: %s [options] image [directory]\n", prog);
    fprintf (stderr, "Options: -b: Ignore the BAM of the disk image.\n");
    fprintf (stderr, "         --: Stop processing any further flags.\n");
    return 1;
  }

  if (scan (prog, argc == 3 ? argv[1] : NULL))
      return 2;

  if (!(infile = fopen (*argv, "rb"))) {
    fprintf (stderr, "%s: Opening the disk image `%s' failed.\n",
	    prog, *argv);
    return 2;
  }

  fseek (infile, 0, 2); /* determine file length */
  if (BLOCK_COUNT << 8 != ftell (infile)) {
    fprintf (stderr, "%s: File `%s' is not a valid 1541 disk image.\n",
	     prog, *argv);
    return 3;
  }

  InitBAM ();

  if (ReadBlock (BAM_block, DIR_TRACK, 0)) {
  DirError:
    fprintf (stderr, "%s: Error reading the directory of image `%s'.\n",
	     prog, *argv);
    fclose (infile);
    return 3;
  }

  if (BAM_block[0] != DIR_TRACK || BAM_block[1] != 1 ||
      BAM_block[2] != 65 || BAM_block[3])
    fprintf (stderr, 
	     "%s: Warning: Disk image `%s' is not of a standard 1541 disk.\n",
	     prog, *argv);

  fprintf (stdout, "; Disk name: ");
  PrintPETSCII (&BAM_block[144], 27);
  fprintf (stdout, "\"\n");

  dir_block[0] = BAM_block[0];
  dir_block[1] = BAM_block[1];

  while (*dir_block) {
    if ((i = ReadBlock (dir_block, dir_block[0], dir_block[1])) && i != 3)
      goto DirError;

    if (*dir_block && *dir_block != DIR_TRACK)
      uIllegalDirBlocks++;

    if (!*dir_block && dir_block[1] != 255)
      fprintf (stderr,
	       "%s: Warning: The directory of `%s' ends improperly.\n",
	       prog, *argv);

    for (uDirCounter = 2; uDirCounter < 258; uDirCounter += 32) {
      if (dir_block[uDirCounter]) {
	if (((dir_block[uDirCounter] ^ 0x80) & 0xB8) ||
	    ((dir_block[uDirCounter] &= 7) - 1) > 3) {
	  uIllegalFileTypes++;
	  continue;
	}

	if (dir_block[uDirCounter] == 4) { /* RELative files */
	  /* check record length */

	  if (!dir_block[uDirCounter + 21]) {
	    uIllegalFiles++;
	    continue;
	  }

	  /* verify side sectors' validity */

	  side_sectors[0] = dir_block[uDirCounter + 19];
	  side_sectors[1] = dir_block[uDirCounter + 20];

	  for (uBlockCount = 0; uBlockCount < 6; uBlockCount++) {
	    /* verify track number */

	    if (side_sectors[uBlockCount << 8] == DIR_TRACK)
	      fWarning |= 2;

	    if ((i = ReadBlock (&side_sectors[uBlockCount << 8],
			       side_sectors[uBlockCount << 8],
			       side_sectors[(uBlockCount << 8) + 1]))) {
	      if (i == 4) {
	      FatalExit:
		fprintf (stderr,
			 "%s: Fatal error reading the disk image `%s'\n",
			 prog, *argv);
		fclose (infile);
		return 4;
	      }

	      break;
	    }

	    /* verify side sector number and record length */

	    if (side_sectors[(uBlockCount << 8) + 2] != uBlockCount ||
		side_sectors[(uBlockCount << 8) + 3] !=
		dir_block[uDirCounter + 21]) {
	      i = 1;
	      break;
	    }

	    if (side_sectors[uBlockCount << 8]) {
	      side_sectors[(uBlockCount + 1) << 8] =
		side_sectors[uBlockCount << 8];
	      side_sectors[((uBlockCount + 1) << 8) + 1] =
		side_sectors[(uBlockCount << 8) + 1];
	      continue;
	    }
	    else {                                      /* last side sector */
	      if (side_sectors[(uBlockCount << 8) + 1] < 17)  /* too short? */
		i = 1;

	      break;
	    }
	  }

	  if (i || uBlockCount > 5) { /* error while processing */
	  SideErr:                    /* the side sectors */
	    uIllegalFiles++;
	    continue;
	  }

	  uBlockCount++;    /* set it to number of side sectors */

	  /* check side sector links */

	  for (uCounter = 0; uCounter < uBlockCount; uCounter++)
	    if (memcmp (&side_sectors[4], &side_sectors[(uCounter << 8) + 4],
			12))
	      break;

	  if (uCounter < uBlockCount)
	    goto SideErr;

	  if (memcmp (&side_sectors[4], &dir_block[uDirCounter + 19], 2))
	    uCounter = 0;
	  else
	    for (uCounter = 1; uCounter < uBlockCount; uCounter++)
	      if (memcmp (&side_sectors[(uCounter - 1) << 8],
			  &side_sectors[(uCounter << 1) + 4], 2))
		break;

	  if (uCounter < uBlockCount)
	    goto SideErr;

	  /* determine total number of blocks in the file */

	  uBlockCount += (uBlockCount - 1) * 120 +
	    ((side_sectors[((uBlockCount - 1) << 8) + 1] - 15) >> 1);
	}
	else /* sequentially organized file */
	  uBlockCount = dir_block[uDirCounter + 28] +
	    (dir_block[uDirCounter + 29] << 8);

	/* try copying the file */

	if (!(outfile = fopen (nexttemp(), "wb"))) {
	  fprintf (stderr, "%s: Fatal: Could not create file %s.\n",
		   prog, tempname);
	  fclose (infile);
	  return 4;
	}

	/* print list file entry */

	fprintf (stdout, "\"%s\"\t", tempname);
	PrintPETSCII (&dir_block[uDirCounter + 3], 16);

	if (dir_block[uDirCounter] != 2) { /* print file type */
	  fprintf (stdout, "\\0%c", filetypes[dir_block[uDirCounter] - 1]);

	  if (dir_block[uDirCounter] == 4)
	    fprintf (stdout, "\\%o", dir_block[uDirCounter + 21]);
	}

	fprintf (stdout, "\"\n");

	block[0] = dir_block[uDirCounter + 1];
	block[1] = dir_block[uDirCounter + 2];
	uBlockCounter = 0;

	while (*block) {
	  if (*block == DIR_TRACK)
	    fWarning |= 2;

	  if (dir_block[uDirCounter] == 4 && uBlockCounter < uBlockCount &&
	      memcmp (block, &side_sectors[((uBlockCounter / 120) << 8) + 16 +
					   ((uBlockCounter % 120) << 1)], 2)) {
		fprintf (stdout, "; File has corrupted side sector data.\n");
		uIllegalFiles++;
		uBlockCount = uBlockCounter + 1; /* kludge to prohibit further
						    complaints about this */
	      }

	  if ((i = ReadBlock (block, block[0], block[1]))) {
	    if (i == 4)
	      goto FatalExit;

	    break;
	  }

	  if (dir_block[uDirCounter] == 4) { /* REL file */
	    if (!*block && (uBlockCounter * 254 + block[1] - 1) %
		dir_block[uDirCounter + 21]) {
	      fprintf (stdout,
		       "; File does not have even amount of records.\n");
	      uIllegalFiles++;
	    }

	    if (uBlockCounter == uBlockCount) {
	      fprintf (stdout, "; File has corrupted side sector data.\n");
	      uIllegalFiles++;
	    }
	  }

	  if (1 != fwrite (&block[2], (long)(*block ? 254 : block[1] - 1),
			   1, outfile)) {
	    fprintf (stderr, "%s: Fatal: Could not write to file %s.\n",
		     prog, tempname);
	    fclose (infile);
	    fclose (outfile);
	    return 4;
	  }

	  uBlockCounter++;
	}

	fclose (outfile);

	if (i) {
	  fprintf (stdout, "; File was truncated.\n");
	  uIllegalFiles++;
	}

	if (dir_block[uDirCounter] == 4) {
	  if (uBlockCount != dir_block[uDirCounter + 28] +
	      (dir_block[uDirCounter + 29] << 8)) {
	  WrongBlockCount:
	    fprintf (stdout, "; File's block count was incorrect.\n");
	    fWarning |= 1;
	  }
	}
	else if (uBlockCount != uBlockCounter)
	  goto WrongBlockCount;
      }
    }
  }

  fclose (infile);

  if (uIllegalDirBlocks || uIllegalFileTypes || uIllegalFiles || fWarning)
    fprintf (stderr, "%s: Warnings about disk image `%s':\n", prog, *argv);

  if (uIllegalDirBlocks)
    fprintf (stderr, "%s: Directory occupies %u non-standard tracks.\n",
	     prog, uIllegalDirBlocks);

  if (uIllegalFileTypes)
    fprintf (stderr, "%s: Ignored %u files of non-standard types.\n",
	     prog, uIllegalFileTypes);

  if (uIllegalFiles) {
    fprintf (stderr,
	     "%s: There were %u files with non-standard structure.\n",
	     prog, uIllegalFiles);
    fprintf (stderr, "%s: They were ignored or improperly extracted.\n", prog);
  }

  if (fWarning & 1)
    fprintf (stderr,
	     "%s: At least one file had improper block count.\n", prog);

  if (fWarning & 2)
    fprintf (stderr,
	     "%s: At least one file occupied some of the directory track.\n",
	     prog);

  if (memcmp (&BAM_block[4], BAM, (DIR_TRACK - 1) << 2) ||
      memcmp (&BAM_block[4 + (DIR_TRACK << 2)],
	      &BAM[DIR_TRACK << 2],
	      (TRACK_COUNT - DIR_TRACK) << 2))
    fprintf (stderr,
	     "%s: Warning: Disk image `%s' has invalid BAM of data tracks.\n",
	     prog, *argv);

  if (memcmp (&BAM_block[DIR_TRACK << 2],
	      &BAM[(DIR_TRACK - 1) << 2], 4))
    fprintf (stderr,
	     "%s: Warning: Disk image `%s' has invalid BAM of dir track.\n",
	     prog, *argv);

  return 0;
}

/* InitBAM - initialize reference BAM */

#ifndef __STDC__
void
InitBAM ()
#else
void InitBAM (void)
#endif
{
  register int i, i2;

  for (i = 0; i < sizeof BAM; BAM[i++] = 255); /* free all blocks */

  for (i = 0; i < TRACK_COUNT; i++) {
    BAM[i << 2] = i2 = block_counts[i + 1]; /* set amount of free
					       blocks on track */
    for (; i2 < 32; i2++)                   /* allocate non-existent blocks */
      BAM[(i << 2) + 1 + (i2 >> 3)] &= ~(1 << (i2 & 7));
  }
}

/* AllocBlock - allocate a block and see if it was already allocated */

/* Return codes:
**  0 -- OK
**  1 -- block has already been allocated
**  2 -- illegal track or sector
*/

#ifndef __STDC__
int
AllocBlock (track, sector)
     unsigned char track;
     unsigned char sector;
#else
int AllocBlock (unsigned char track, unsigned char sector)
#endif
{
  if (track > TRACK_COUNT || sector >= block_counts[track])
    return 2;

  track--;

  if (!BAM[track << 2])
    return 1;        /* no blocks free on the track */

  if (!(BAM[(track << 2) + 1 + (sector >> 3)] & (1 << (sector & 7))))
    return 1;        /* block has already been allocated */

  /* allocate block and decrement count of free blocks on the track */

  BAM[(track << 2) + 1 + (sector >> 3)] &= ~(1 << (sector & 7));
  BAM[track << 2]--;

  return 0;
}

/* ReadBlock - read a block and verify its validity */

/* Return codes:
**  0 -- OK
**  1 -- block has already been allocated
**  2 -- illegal track or sector
**  3 -- error in the block's format
**  4 -- error in reading the disk image
*/

#ifndef __STDC__
int
ReadBlock (buffer, track, sector)
     unsigned char *buffer;
     unsigned char track;
     unsigned char sector;
#else
int ReadBlock (unsigned char *buffer, unsigned char track,
	       unsigned char sector)
#endif
{
  int i;

  if ((i = AllocBlock (track, sector)))
    return i;

  for (i = (int)sector; --track; i += (int)block_counts[track]);

  if (fseek (infile, (long int)i << 8, 0))
    return 4;

  if (1 != fread (buffer, 256, 1, infile))
    return 4;

  if (!buffer[0] && buffer[1] < 2)
    return 3;

  return 0;
}

#ifndef __STDC__
void
PrintPETSCII (string, length)
     unsigned char *string;
     int length;
#else
void PrintPETSCII (const unsigned char *string, int length)
#endif
{
  int i;
  register unsigned char temp;

  for (; string[--length] == 160;); /* remove trailing shifted spaces */

  length++;

  fputc ('"', stdout);

  for (i = 0; i < length; i++) {
    temp = string[i];

    temp = temp < 65 ? temp : (temp > 90 ? (temp < 193 || temp > 218 ?
					    temp : temp & ~128) :
			       temp | 32);

    fprintf (stdout, (temp & 127) < 32 ?
	     (i == length - 1 || string[i + 1] < '0' || string [i + 1] > '9' ?
	      "\\%o" : "\\%03o") :
	     (temp == '"' || temp == '\\' ? "\\%c" : "%c"), temp);
  }
}
