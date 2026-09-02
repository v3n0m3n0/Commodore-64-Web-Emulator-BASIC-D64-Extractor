/******************************************************************
* UnArk - Extracts files from C64 Arkives
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
* v1.0      August 25th, 1993   First released version.
******************************************************************/

#include <stdio.h>
#include <stdlib.h>
#include "scan.h"

/* length of copying buffer */

#define BUFFER_SIZE 4096

/*********************
* Function prototypes
*********************/

#ifdef __STDC__
int main (int argc, char **argv);
void PrintPETSCII (const unsigned char *string, int length);
#else
int main ();
void PrintPETSCII ();
#endif

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
  FILE *infile, *outfile;
  unsigned char *buf;
  char *prog;

  static char *filetypes = "SPUR";

  unsigned int
    uFileCount,
    uFileCounter,
    uCounter,
    uIllegalFileTypes = 0,
    uIllegalFiles = 0;

  unsigned long int
    luHeaderPointer,
    luArkivePointer,
    luFileLength;

  for (prog = *argv; *prog; prog++);
  for (; prog > *argv && *prog != '/'; prog--);
  if (*prog == '/') prog++;

  argv++;

  if (argc < 2 || argc > 3) {
    fprintf (stderr, "Commodore Arkive extractor v1.0\n");

    fprintf (stderr, "Usage: %s image [directory]\n", prog);
    return 1;
  }

  if (scan (prog, argc == 3 ? argv[1] : NULL))
      return 2;

  if (!(infile = fopen (*argv, "rb"))) {
    fprintf (stderr, "%s: Opening the archive file %s failed.\n",
	    prog, *argv);
    return 2;
  }

  if (!(buf = (unsigned char *)malloc (BUFFER_SIZE))) {
    fprintf (stderr, "%s: Out of core.\n", prog);
    fclose (infile);
    return 3;
  }

  if (143 < (uFileCount = (unsigned)fgetc (infile)) - 1) {
    fprintf (stderr, "%s: Error in the file count of %s.\n", prog, *argv);
    fclose (infile);
    return 3;
  }

  luArkivePointer = 1 + 29 * (unsigned long)uFileCount;
  luArkivePointer = 254 * (1 + luArkivePointer / 254 -
			   !(luArkivePointer % 254));
  luHeaderPointer = 1;

  /* start extracting files */

  for (uFileCounter = 0; uFileCounter++ < uFileCount;) {
    if (fseek (infile, luHeaderPointer, 0) ||
	29 != fread (buf, 1, 29, infile)) {
      fprintf (stderr, "%s: Arkive `%s': error in directory.\n", prog, *argv);
      fclose (infile);
      return 2;
    }

    luHeaderPointer += 29;

    if ((*buf ^ 0x80) & 0xB8 || ((*buf &= 7) - 1) > 3) {
      uIllegalFileTypes++;
      luArkivePointer += (buf[27] + (buf[28] << 8)) * 254;
      continue;
    }

    if (*buf == 4) { /* RELative files */
      /* check record length */

      if (!buf[18]) {
	uIllegalFiles++;
	luArkivePointer += (buf[27] + (buf[28] << 8)) * 254;
	continue;
      }

      /* check side sector count */

      luFileLength = buf[27] + (buf[28] << 8);
      luFileLength = 8 * (1 + luFileLength / 120) + (luFileLength % 120) * 2;

      if (buf[25] != (luFileLength / 254) + 1 - !(luFileLength % 254) ||
	  buf[26] != (luFileLength % 254) + 1) {
	fprintf (stdout, "; Improper side sector count or length.\n");
	uIllegalFiles++;
      }

      luFileLength = (buf[27] + (buf[28] << 8) - buf[25]) * 254 -
	255 + buf[1];
    }
    else
      luFileLength = (buf[27] + (buf[28] << 8)) * 254 - 255 + buf[1];

    /* try copying the file */

    if (!(outfile = fopen (nexttemp(), "wb"))) {
    outFail:
      fprintf (stderr, "%s: Fatal: Could not create file %s.\n",
	       prog, tempname);
      fclose (infile);
      return 4;
    }

    /* print list file entry */

    fprintf (stdout, "\"%s\"\t", tempname);
    PrintPETSCII (&buf[2], 16);

    if (*buf != 2) { /* print file type */
      fprintf (stdout, "\\0%c", filetypes[*buf - 1]);

      if (*buf == 4) {
	fprintf (stdout, "\\%o", buf[18]);

	/* check file length */

	if (luFileLength % buf[18]) {
	  fprintf (stdout,
		   "; The file does not have even amount of records.\n");
	  uIllegalFiles++;
	}
      }
    }

    fprintf (stdout, "\"\n");

    fseek (infile, luArkivePointer, 0);
    luArkivePointer += 254 * (buf[27] + (buf[28] << 8));

    if (*buf == 4)  /* Arkive stores last side sector, wasting 254 bytes */
      luArkivePointer -= 254 * (buf[25] - 1);  /* for each relative file */

    for (; luFileLength; luFileLength -= uCounter) {
      uCounter = fread (buf, sizeof *buf, BUFFER_SIZE > luFileLength ?
			      luFileLength : BUFFER_SIZE, infile);

      if (uCounter != fwrite (buf, sizeof *buf, uCounter, outfile)) {
	fclose (outfile);
	goto outFail;
      }

      if (uCounter < BUFFER_SIZE && luFileLength > uCounter) {
	fprintf (stderr, "%s: The archive file `%s' is truncated.\n",
		 prog, *argv);
	fprintf (stderr, "%s: Last file written is %u bytes too short.\n",
		 prog, luFileLength - uCounter);

	if (uFileCount > uFileCounter)
	  fprintf (stderr, "%s: In addition to that, you lost %u %s.\n",
		   prog, uFileCount - uFileCounter,
		   uFileCount - uFileCounter == 1 ? "file" : "files");

	fclose (infile);
	fclose (outfile);
	return 4;
      }
    }

    fclose (outfile);
  }

  if (fseek (infile, luArkivePointer, 2))
    fprintf (stderr, "%s: Warning: `%s' is %u bytes too short.\n",
	     prog, *argv, luArkivePointer - ftell (infile));
  else {
    fseek (infile, 0, 2);
    luArkivePointer = ftell (infile) - luArkivePointer;

    if (luArkivePointer)
      fprintf (stderr, "%s: Warning: `%s' is %u bytes too long.\n",
	       prog, *argv, luArkivePointer);
  }

  if (uIllegalFileTypes || uIllegalFiles)
    fprintf (stderr, "%s: Warnings about disk image %s:\n", prog, *argv);

  if (uIllegalFileTypes)
    fprintf (stderr, "%s: Ignored %u files of non-standard types.\n",
	     prog, uIllegalFileTypes);

  if (uIllegalFiles) {
    fprintf (stderr,
	     "%s: There were %u relative files with non-standard structure.\n",
	     prog, uIllegalFiles);
    fprintf (stderr, "%s: They were ignored or improperly extracted.\n", prog);
  }

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
