/****************************************************************/
/*    "zip2dsk" converts four Zip-Code files into               */
/*              C-64 disk image                                 */
/*                                                              */
/*    v1.0:   May 16th, 1993                                    */
/*                                                              */
/*    Author: Paul David Doherty (h0142kdd@rz.hu-berlin.de)     */
/*                                                              */
/*    v1.1:   August 23rd, 1993                                 */
/*                                                              */
/*    Optimized and added data integrity checks by              */
/*    Marko M"akel"a (Marko.Makela@Helsinki.FI)                 */
/****************************************************************/

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define OUT_SUFFIX ".disk"
#define OUT_SUFFIX_L 5

FILE *infile, *outfile;

int track, sect, max_sect, position;
unsigned char act_track[21 << 8];
int sect_flag[21];
char *inname, *outname, *prog;

#ifdef __STDC__
int main (int argc, char **argv);
int init_files (char *basename);
int open_file (int number);
int read_track (void);
int read_sector (void);
#else
int main ();
int init_files ();
int open_file ();
int read_track ();
int read_sector ();
#endif

/*******************************************************************/
/*  MAIN function                                                  */
/*******************************************************************/

/* Return codes:
** 0 -- OK
** 1 -- RTFM
** 2 -- out of memory
** 3 -- file I/O error
** 4 -- error in ZipCoded files
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
  for (prog = *argv; *prog++;);
  for (; prog > *argv && *prog != '/'; prog--);
  if (*prog == '/') prog++;

  argv++;

  if (argc != 2 && argc != 3) {
    fprintf (stderr, "ZipCode disk image extractor v1.1\n");
    fprintf (stderr, "Usage: %s zip_image_name [disk_image_name]\n", prog);
    return 1;
  }
 
  outname = (argc == 3) ? argv[1] : NULL;

  switch (init_files (*argv)) {
  case 3:
    fprintf (stderr, "%s: Could not create %s.\n", prog, outname);
    return 3;
  case 2:
    fprintf (stderr, "%s: File %s not found.\n", prog, inname);
    return 3;
  case 1:
    fprintf (stderr, "%s: Out of memory.\n", prog);
    return 2;
  }

  for (track = 1; track <= 35; track++) {
    max_sect = 17 + ((track < 31) ? 1 : 0) + ((track < 25) ? 1 : 0) +
      ((track < 18) ? 2 : 0);

    switch (track) {
    case 1:
      if (open_file (1))
	goto OpenError;
      break;
    case 9:
      if (open_file (2))
	goto OpenError;
      break;
    case 17:
      if (open_file (3))
	goto OpenError;
      break;
    case 26:
      if (open_file (4))
	goto OpenError;
      break;
    }

    if (read_track ()) {
      fclose (infile);
      fclose (outfile);
      return 4;
    }

    if (max_sect != fwrite (act_track, 256, max_sect, outfile)) {
      fclose (infile);
      fclose (outfile);
      fprintf (stderr, "%s: Error in writing the output file.\n", prog);
      return 3;
    }
  }

  return 0;

OpenError:
  fprintf (stderr, "%s: Error in opening file %s.", prog, inname);
  return 3;
}

/*******************************************************************/
/*  Function: init_files                                           */
/*******************************************************************/

/* Return codes:
** 0 -- OK
** 1 -- out of memory
** 2 -- not all input files found
** 3 -- unable to create output file
*/

#ifndef __STDC__
int
init_files (filename)
     char *filename;
#else
int init_files (char *filename)
#endif
{
  int i, flag = 0;

  i = strlen (filename);

  /* allocate memory for filenames */

  if (outname)
    flag = 1;

  if (!(inname = (char *)malloc (i + 2)) ||
	(!outname && !(outname = (char *)malloc (i + OUT_SUFFIX_L))))
    return 1;

  /* copy the base filename */

  strcpy (inname, filename);

  if (!flag)
    strcpy (outname, filename);

  /* modify input filename */

  for (; i && inname[i] != '/'; i--);
  position = i ? ++i : i;
  inname[position + 1] = '!';
  for (; (inname[i + 2] = filename[i]); i++);

  /* modify output filename */

  if (!flag)
    strcat (outname, OUT_SUFFIX);

  /* try to find the input files */

  for (i = 1; i < 5; i++) {
    inname[position] = '0' + (char)i;
    infile = fopen (inname, "rb");

    if (infile)
      fclose (infile);
    else
      return 2;
  }

  /* try to create output file */

  if (!(outfile = fopen (outname, "wb")))
    return 3;

  if (!flag)
    free (outname);

  return 0;
}

/*******************************************************************/
/*  Function: open_file                                            */
/*******************************************************************/

/* Return codes:
** 0 -- OK
** 1 -- error
*/

#ifndef __STDC__
int
open_file (number)
     int number;
#else
int open_file (int number)
#endif
{
  inname[position] = '0' + (char)number;

  if (number > 1)
    fclose (infile);

  if (!(infile = fopen (inname, "rb")) ||
      -1 == fseek (infile, (number == 1) ? 4 : 2, 0))
    return 1;

  return 0;
}

/*******************************************************************/
/*  Function: read_track                                           */
/*******************************************************************/

/* Return codes:
** 0 -- OK
** 1 -- error
*/

#ifndef __STDC__
int
read_track ()
#else
int read_track (void)
#endif
{
  for (sect = 0; sect < max_sect; sect_flag[sect++] = 0);

  for (sect = 0; sect < max_sect; sect++)
    if (read_sector ())
      return 1;

  return 0;
}

/*******************************************************************/
/*  Function: read_sector                                          */
/*******************************************************************/

/* Return codes:
** 0 -- OK
** 1 -- error
*/

#ifndef __STDC__
int
read_sector ()
#else
int read_sector (void)
#endif
{
  unsigned char trk, sec, len, rep, repnum, chra;
  int i, j, count;

  trk = fgetc (infile);
  sec = fgetc (infile);

  if ((trk & 0x3f) != track || sec >= max_sect || sect_flag[sec] ||
      feof (infile)) {
  Error:
    fprintf (stderr, "%s: Input file %s is corrupted.\n", prog, inname);
    return 1;
  }

  sect_flag[sec] = 1;

  if (trk & 0x80) {
    len = fgetc (infile);
    rep = fgetc (infile);
    count = 0;

    for (i = 0; i < len; i++) {
      if (feof (infile))
	goto Error;
      chra = fgetc (infile);

      if (chra != rep)
	act_track[(sec << 8) + count++] = chra;
      else {
	repnum = fgetc (infile);
	if (feof (infile))
	  goto Error;
	chra = fgetc (infile);
	i += 2;
	for (j = 0; j < repnum; j++)
	  act_track[(sec << 8) + count++] = chra;
      }
    }
  }

  else if (trk & 0x40) {
    if (feof (infile))
      goto Error;
    chra = fgetc (infile);
    for (i = 0; i < 256; i++)
      act_track[(sec << 8) + i] = chra;
  }

  else if (256 != fread (&act_track[sec << 8], 1, 256, infile))
    goto Error;

  return 0;
}
