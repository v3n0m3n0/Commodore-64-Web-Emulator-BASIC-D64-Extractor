#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "scan.h"

/*********************************************************************
* UnLynx v1.0
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
* v0.1      June    6th, 1993    Initial version.
* v0.2      June    8th, 1993    Corrected version.
* v0.3      June    8th, 1993    Added user-friendliness.
* v0.4      June   21st, 1993    Added support for Lynxette,
*                                some bug fixes.
* v0.5      August  8th, 1993    Added support for relative files
*                                and Lynx VI and IX headers, and
*                                changed command line parameters.
*                                Should now extract any Lynx archive.
* v1.0      August 17th, 1993    First released version.
*********************************************************************/

#define BUFFER_SIZE 4096 /* length of copying buffer */

/*********************
* Function prototypes
*********************/

#ifndef __STDC__
int main();             /* main function */
#else
int main(int argc, char **argv);
#endif

/***********
* Functions
***********/

#ifdef __STDC__
int main(int argc, char **argv)
#else
int
main(argc,argv)
     int argc;
     char **argv;
#endif
{
  FILE *infile, *outfile;
  unsigned char *buf, filetype, filename[16],
                bRecordLength = 0, fNoLength = 0;
  unsigned uFileCount, uFileCounter, uByteCount, uCounter;
  unsigned long luHeaderPointer, luArchivePointer, luFileLength,
                luHeaderEndPointer;

  for (uCounter = strlen (*argv); uCounter && (*argv)[uCounter] != '/';
       uCounter--);
  if ((*argv)[uCounter] == '/') *argv += uCounter + 1;

  if (argc < 2 || argc > 3) {
    fprintf (stderr, "Lynx archive extractor v1.0\n");
    fprintf (stderr, "Usage: %s archive [directory]\n", *argv);
    return 1;
  }

  if (scan (*argv, argc==3 ? argv[2] : NULL))
      return 2;

  if ((infile = fopen(argv[1], "rb")) == NULL) {
    fprintf (stderr, "%s: Opening the archive file %s failed.\n",
	    *argv, argv[1]);
    return 2;
  }

  if ((buf = (unsigned char *)malloc(BUFFER_SIZE)) == NULL) {
    fprintf (stderr, "%s: Out of memory.\n", *argv);
    fclose (infile);
    return 3;
  }

  /* determine if it really is a Lynx archive */

  uByteCount = fread (buf, sizeof *buf, BUFFER_SIZE, infile);

  for (uCounter = 0; memcmp (&buf[uCounter], "\0\0\0\15", 4) &&
       uCounter < 92; uCounter++);

  if (uCounter == 92)
    rewind (infile);            /* BASIC header not found */
  else
    fseek (infile, (unsigned long)uCounter + 4, 0); /* skip the BASIC header */

  /* Get number of blocks in Lynx header */

  luHeaderPointer = ftell (infile);

  if (!fscanf (infile, " %u", &uCounter) || !uCounter) {
  NotLynx:
    fprintf (stderr, "%s: `%s' is not a Lynx archive.\n", *argv, argv[1]);
    fclose (infile);
    return 2;
  }

  if (luHeaderPointer + 2 == ftell (infile) && ' ' != fgetc (infile))
    goto NotLynx;

  if (luHeaderPointer + 3 == ftell (infile) && ' ' != fgetc (infile))
    goto NotLynx;

  if (luHeaderPointer + 4 != ftell (infile))
    goto NotLynx;

  /* verify Lynx signature */

  if (25 > fread (buf, sizeof *buf, 25, infile) || buf[24] != 13)
    goto NotLynx;

  buf[24] = 0;
  if (!strstr ((char *)buf, "LYNX"))
    goto NotLynx;

  /* determine number of files */

  if (!fscanf (infile, " %u \015", &uFileCount) || !uFileCount)
    goto NotLynx;

  luHeaderPointer = ftell (infile);
  luHeaderEndPointer = luArchivePointer = 254 * uCounter;

  /* start extracting files */

  for (uFileCounter = 0; uFileCounter++ < uFileCount;) {
    if (luHeaderPointer >= luHeaderEndPointer) {
    hdrErr:
      fprintf (stderr, "%s: Archive `%s': error in Lynx directory.\n", 
	       *argv, argv[1]);
      fclose (infile);
      return 2;
    }
      
    fseek (infile, luHeaderPointer, 0);

    for (uCounter = 0; uCounter < 17 &&
	 (buf[uCounter] = fgetc (infile)) != 13;
	 uCounter++);

    if (uCounter > 16)
      goto hdrErr;

    /* convert filename */

    for (uByteCount = 0; uByteCount < uCounter; uByteCount++)
      filename[uByteCount] = buf[uByteCount] < 64 ?
	buf[uByteCount] : buf[uByteCount] >= 96 ?
	  (buf[uByteCount] & (~128)) | 64 : buf[uByteCount] + 32;

    for (; uCounter && buf[uCounter - 1] == 160; uCounter--);

    filename[uCounter] = buf[uCounter] = 0;

    if (!uCounter)
      fprintf (stderr, "%s: Warning: entry %u of `%s' has blank filename.\n",
	       *argv, uFileCounter, argv[1]);

    if (!fscanf (infile, " %u \015%c\015", &uCounter, &filetype))
      goto hdrErr;

    if (!fscanf (infile, " %u \015", &uByteCount)) {
      if (filetype == 'R' || uFileCounter + 1 < uFileCount)
	goto hdrErr;

      fNoLength = 1;
      uByteCount = 255;
    }

    if (filetype == 'R') {
      bRecordLength = (unsigned char)uByteCount;

      if (!fscanf (infile, " %u \015", &uByteCount)) {
	if (uFileCounter + 1 < uFileCount)
	  goto hdrErr;

	fNoLength = 1;
	uByteCount = 255;
      }
    }

    if ((uCounter && uByteCount < 2) || (uByteCount == 1) || 
	(!uCounter && uByteCount)) {
      fprintf (stderr, "%s: Skipping `%s' of `%s': illegal file length.\n",
	       *argv, filename, argv[1]);
      fprintf (stderr, "%s: Fatal warning: Check the resulting files!\n",
	       *argv);
      fprintf (stderr, "%s: The remaining files may extract totally wrong.\n",
	       *argv);
      continue;
    }

    luFileLength = uByteCount ? ((unsigned long)uCounter * 254 -
				 255 + uByteCount) : 0;

    if (filetype == 'R') {
      luArchivePointer += 254 * (1 + luFileLength / 254 / 120);
      luFileLength     -= 254 * (1 + luFileLength / 254 / 120);

      if (luFileLength % bRecordLength)
	fprintf (stderr,
		 "%s: Warning: `%s': Error in file %s's record length\n",
		 *argv, argv[1], filename);
    }

    luHeaderPointer = ftell(infile);

    if (filetype != 'P' && filetype != 'U' &&
	filetype != 'S' && filetype != 'R') {
      fprintf (stderr, "%s: Skipping `%s': unsupported filetype `%c'.\n",
	       *argv, filename, filetype);

      luArchivePointer += 254 * (luFileLength / 254 +
				 1 - !(luFileLength % 254));
      continue;
    }

    /* Print original file name and type */

    fprintf (stdout, "; \"");

    for (uCounter = 0; buf[uCounter]; uCounter++)
      fprintf (stdout, (buf[uCounter] & 127) < 32 ?
	       (!buf[uCounter + 1] || buf[uCounter + 1] < '0' ||
		buf[uCounter + 1] > '9' ? "\\%o" : "\\%03o") :
	       (buf[uCounter] == '"' || buf[uCounter] == '\\' ?
		"\\%c" : "%c"), buf[uCounter]);

    fprintf (stdout, "\", %c", filetype);

    if (filetype == 'R')
      fprintf (stdout, "%u", (unsigned)bRecordLength);

    /* Extract the file */

    if ((outfile = fopen (nexttemp(), "wb")) == NULL) {
    outFail:
      fprintf (stderr, "%s: Failed in creating a file.\n", *argv);
      fclose (infile);
      return 4;
    }

    fseek (infile, luArchivePointer, 0);
    luArchivePointer += 254 * (luFileLength / 254 + 1 - 
			       !(luFileLength % 254));

    for (; luFileLength; luFileLength -= uCounter) {
      uCounter = fread (buf, sizeof *buf, BUFFER_SIZE > luFileLength ?
			luFileLength : BUFFER_SIZE, infile);

      if (uCounter > fwrite (buf, sizeof *buf, uCounter, outfile)) {
	fclose (outfile);
	goto outFail;
      }

      if (uCounter < BUFFER_SIZE && luFileLength > uCounter) {
	if (fNoLength)
	  break;

	fprintf (stderr, "%s: The archive file is truncated.\n", *argv);
	fprintf (stderr, "%s: Last file written is %u bytes too short.\n",
		 *argv, luFileLength - uCounter);

	if (uFileCount > uFileCounter)
	  fprintf (stderr, "%s: In addition to that, you lost %u %s.\n",
		   *argv, uFileCount - uFileCounter,
		   uFileCount - uFileCounter == 1 ? "file" : "files");

	fclose (infile);
	fclose (outfile);
	return 5;
      }
    }

    fclose (outfile);

    /* print the lzhconvert information */

    fprintf (stdout, "\n\"%s\"\t\"", tempname);

    for (uCounter = 0; filename[uCounter]; uCounter++)
      fprintf (stdout, (filename[uCounter] & 127) < 32 ?
	       (!filename[uCounter + 1] || filename[uCounter + 1] < '0' ||
		filename[uCounter + 1] > '9' ? "\\%o" : "\\%03o") :
	       (filename[uCounter] == '"' || filename[uCounter] == '\\' ?
		"\\%c" : "%c"), filename[uCounter]);

    if (filetype != 'P') {
      fprintf (stdout, "\\0%c", filetype);

      if (filetype == 'R')
	fprintf (stdout, "\\%o", bRecordLength);
    }

    fprintf (stdout, "\"\n");
  }

  if (fNoLength) {
    fprintf (stderr,
	     "%s: Warning: File `%s' of `%s' may contain extra bytes.\n",
	     *argv, filename, argv[1]);
  } else {
    luArchivePointer = ftell (infile);
    fseek (infile, 0, 2);
    luArchivePointer = ftell (infile) - luArchivePointer;

    if (luArchivePointer)
      fprintf (stderr, "%s: Warning: Archive `%s' is %lu bytes too long.\n",
	       *argv, argv[1], luArchivePointer);
  }

  fclose (infile);

  return 0;
}
