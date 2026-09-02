#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "scan.h"

/************************************************************
* LZHconvert v1.02
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
* v0.99     March 26th, 1993    The first version.
* v1.00     April  8th, 1993    Added better header support
*                               and validity checking.
* v1.01     May    3rd, 1993    Added descriptive messages
*                               and improved documentation.
* v1.02     July  26th, 1993    Added list-file creation and
*                               changed command-line syntax
*                               and messages.
************************************************************/

/* Determine endianess */

#ifdef __STDC__
#include <endian.h>
#endif

#ifndef LITTLE_ENDIAN
#define BUILD_WORDS
#endif
    /* You may comment the previous lines out, if your system stores words */
    /* and double words in memory starting from the least significant byte */
    /* and if the size of an unsigned integer is at least two bytes and if */
    /* the size of an unsigned long is four bytes. */

#define BUFFER_SIZE         4096
    /* Maximum size of SFX header or other prefix information */
    /* This specifies the size of the copying buffer as well. */

#define MIN_HEADER_SIZE     50
    /* Minimum amount of first bytes of an header required to */
    /* determine whether the bytes contain a valid header. */

#define MAXLINE 512
    /* Maximum length of a list file's line */

unsigned char *filelist;    /* Pointer to a table of files to be renamed */
unsigned int length=0;      /* Length of the table */

/***********************************************************
* Format of the table:
*
* offset        bytes   description
*     0         1       length of an old filename       (i0)
*     1         1       length of a replacing filename  (j0)
*     2         i0      old filename
*    2+i0       j0      new filename
*
*   2+i0+j0     1       length of an old filename       (i1)
*   3+i0+j0     1       length of a replacing filename  (j1)
*   4+i0+j0     i1      old filename
* 4+i0+j0+i1    j1      new filename
*
* 4+i0+j0+i1+j1 1       length of an old filename       (i2)
*    ...
*    xxx        jn      new filename
*   length      (first unused byte of the table)
***********************************************************/

/*********************
* Function prototypes
*********************/

#ifndef __STDC__
int main();             /* main function */
int check_header();     /* Returns -1, if the header is invalid, */
                        /*         -2, if it is of unknown type, and */
                        /*         header level, if the header is valid. */

int prepare_list();     /* Prepares the list of files to be renamed. */
int is_hex();           /* Returns nonzero, if the parameter is a hex digit. */
unsigned char hex();    /* Returns the value of a hex digit. */
#else
int main(int argc, char **argv);
int check_header(unsigned char *header);
int prepare_list(char *programname);
int is_hex(unsigned char digit);
unsigned char hex(unsigned char digit);
#endif /* __STDC__ */

/***********
* Functions
***********/

#ifdef __STDC__
int main (int argc, char **argv)
#else
int
main (argc,argv)
     int argc;
     char **argv;
#endif
{
  FILE *infile, *outfile = NULL;
  unsigned char *buf, *entry = NULL, *nextentry, sum;
  unsigned int uCount, uCounter;
  unsigned long ulPackedSize;

  for (uCounter = strlen (*argv); uCounter && (*argv)[uCounter] != '/';
       uCounter--);
  if ((*argv)[uCounter] == '/') *argv += uCounter + 1;

  if ((argc == 3 && !prepare_list(*argv)) || argc < 2 || argc > 3) {
    fprintf (stderr, "LHArchive header converter v1.02\n");
    fprintf (stderr, "Usage: %s infile [outfile]\n\n", *argv);
    fprintf (stderr, "Renames files in LHArchives.\n");
    return 1;
  }

  nextentry = filelist;

  if (argc == 2 && scan(*argv, NULL))
    return(1);

  if ((infile = fopen(argv[1], "rb")) == NULL) {
    fprintf(stderr, "%s: Opening the input file %s failed.\n",
	    *argv, argv[1]);
    return 2;
  }

  if (argc == 3 && (outfile = fopen(argv[2], "wb")) == NULL) {
    fprintf (stderr, "%s: Opening the output file %s failed.\n",
	     *argv, argv[1]);
    fclose (infile);
    return 2;
  }

  if ((buf = (unsigned char *)malloc(BUFFER_SIZE)) == NULL) {
    fprintf (stderr, "%s: Out of memory.\n", *argv);
    fclose (infile);

    if (argc == 3)
      fclose (outfile);

    return 3;
  }

  do {        /* search the file for the first valid LHArchive header */
    uCount = fread(buf, sizeof *buf, BUFFER_SIZE, infile);

    for (uCounter = 0; uCounter + MIN_HEADER_SIZE < uCount &&
	 check_header(buf + uCounter) < 0; uCounter++);

    fseek(infile, (long)uCounter - (long)uCount, 1);
  }
  while(uCounter + MIN_HEADER_SIZE == uCount && uCount > MIN_HEADER_SIZE);

  if (uCount <= MIN_HEADER_SIZE) {
    fprintf(stderr, "%s: No LHarchive records found.\n", *argv);
  Error:
    fclose (infile);
    if (argc == 3)
      fclose (outfile);

    return 4;
  }

 Loop:
  uCount = (unsigned)buf[uCounter] + 2;

  if (uCount != fread(buf,sizeof *buf,uCount,infile))
    goto EOFerror;

  switch(check_header(buf)) {
  case -1:
    fprintf(stderr,
	    "%s: The file %s is either of unsupported type or corrupted.\n",
	    *argv, argv[1]);
    goto Error;

  case -2:
    fprintf(stderr, "%s: The input file %s is corrupted.\n",
	    *argv, argv[1]);
    goto Error;

  case 0:
  case 1:
    break;

  default:
    fprintf (stderr, "%s: File %s:\n\
This version of LZHconvert supports only LHArc header levels 0 and 1.\n\
Use `lha -ag' or similar to create the archive.\n",
	     *argv, argv[1]);
    goto Error;
  }

  if (argc == 3) {                       /* search for filename in the list */
    for (entry = nextentry; entry < &filelist[length];
	 entry += 2 + *entry + entry[1]) {
      if (*entry != buf[21])   /* file name lengths must match */
	continue;

      for (uCounter = 0; buf[22 + uCounter] == entry[2 + uCounter] &&
	   uCounter < (unsigned)*entry; uCounter++);

      if ((unsigned char)uCounter == *entry) {
	nextentry = entry + 2 + *entry + entry[1];
	break;
      }
    }

    /* wrap to the beginning of the list, if the search did not match */

    if (entry == &filelist[length]) {
      for (entry = filelist; entry < nextentry;
	   entry += 2 + *entry + entry[1]) {
	if (*entry != buf[21])   /* file name lengths must match */
	  continue;

	for (uCounter = 0; buf[22 + uCounter] == entry[2 + uCounter] &&
	     uCounter < (unsigned)*entry; uCounter++);

	if ((unsigned char)uCounter == *entry) {
	  nextentry = entry + 2 + *entry + entry[1];
	  break;
	}
      }

      if (entry == nextentry)
	entry = &filelist[length];
    }
  }

#ifndef BUILD_WORDS
  ulPackedSize = *(unsigned long *)&buf[7];
#else
  ulPackedSize = ((unsigned long)buf[10] << 24) |
    ((unsigned long)buf[9] << 16) |
      ((unsigned long)buf[8] << 8) |
	(unsigned long)buf[7];
#endif

  if (buf[20] && *buf - buf[21] >= 25) {  /* skip extended headers */
#ifndef BUILD_WORDS
    uCounter = *(unsigned *)&buf[*buf];
#else
    uCounter = (buf[*buf]) | ((unsigned)buf[*buf + 1] << 8);
#endif
    while(uCounter) {
      ulPackedSize -= uCounter;

      if (uCounter)
	fseek(infile, (long)uCounter - 2, 1);
#ifndef BUILD_WORDS
      if (2 > fread(&uCounter, sizeof *buf, 2, infile))
	goto EOFerror;
#else
      uCounter = ((unsigned)getc(infile));
      uCounter |= ((unsigned)(uCount = (int)getc(infile))) << 8;

      if((int)uCount == EOF)
	goto EOFerror;
#endif
    }
  }

#ifndef BUILD_WORDS
  *(unsigned long *)&buf[7] = ulPackedSize;
#else
  buf[7] = (unsigned char)ulPackedSize;
  buf[8] = (unsigned char)(ulPackedSize >> 8);
  buf[9] = (unsigned char)(ulPackedSize >> 16);
  buf[10] = (unsigned char)(ulPackedSize >> 24);
#endif

  buf[20] = 0;                        /* convert to header level 0 */
  uCount = buf[21];

  if (argc == 3 && entry != &filelist[length]) {   /* a filename matched */
    sum = (unsigned char)(buf[buf[21] + 22] + buf[buf[21] + 23]);

    buf[21] = entry[1];                     /* adjust file name length */
    *buf = (unsigned char)(entry[1] + 22);  /* adjust header length */

    for(uCounter = 20; uCounter--; sum += buf[2 + uCounter]);

    for(uCounter = entry[1], entry += *entry + 2; uCounter--;
	sum += entry[uCounter]);

    buf[1] = sum;

    fwrite(buf, sizeof *buf, 22, outfile);  /* write beginning of header */
    fwrite(entry, sizeof *entry, buf[21], outfile);
                                            /* write the new filename */
    if (*buf - buf [21] >= 22)              /* write the CRC of the file */
      fwrite(buf + 22 + uCount, sizeof *buf, 2, outfile);
  } else if (argc == 3) {
    fprintf(stderr, "%s: Not renaming `%s'.\n", *argv, &buf[22]);

    *buf = (unsigned char)(buf[21] + 22);   /* adjust header length */
    for (uCounter = *buf, sum = 0; uCounter--; sum += buf[2 + uCounter]);
    buf[1] = sum;                       /* correct header checksum */

    fwrite (buf, sizeof *buf, 2 + *buf, outfile);    /* write the header */
  } else {
    nexttemp();

    fputc('"', stdout);

    for (uCounter = 22; uCounter < 22 + buf[21]; uCounter++)
      fprintf (stdout, (buf[uCounter] & 127) < 32 ?
	       (uCounter == 21 + buf[21] || buf[uCounter + 1] < '0' ||
		buf[uCounter + 1] > '9' ? "\\%o" : "\\%03o") :
	       (buf[uCounter] == '"' || buf[uCounter] == '\\' ?
		"\\%c" : "%c"), buf[uCounter]);

    fprintf (stdout, "\"\t\"%s\"\n", tempname);
  }

  if (argc == 3) {
    for(; ulPackedSize > BUFFER_SIZE; ulPackedSize -= BUFFER_SIZE) {
      if (BUFFER_SIZE > fread(buf, sizeof *buf, BUFFER_SIZE, infile)) {

      EOFerror:	  /* end of file occurred too early */

	fprintf(stderr, "%s: The input file `%s' is corrupted.\n",
		*argv, argv[1]);
	goto Error;
      }

      fwrite(buf,sizeof *buf,BUFFER_SIZE,outfile);
    }

    uCounter = (unsigned)ulPackedSize;
    uCount = fread(buf, sizeof *buf, BUFFER_SIZE, infile);

    if (uCount < uCounter)
      goto EOFerror;              /* end of file occurred too early */

    fwrite (buf, sizeof *buf, uCounter, outfile);

    if (uCount > uCounter && buf[uCounter]) {
      fseek (infile, (long)ulPackedSize - (long)uCount, 1);
      goto Loop;
    }
  } else {
    if (fseek(infile, (long)ulPackedSize, 1))
      goto EOFerror;

    uCount = fread (buf, sizeof *buf, BUFFER_SIZE, infile);
    uCounter = 0;

    if (uCount && *buf && *buf != 26) {
      fseek (infile, -(long)uCount, 1);
      goto Loop;
    }
  }

  if (argc == 3) {           /* write the terminating null but no padding */
    fputc ('\0', outfile);
    fclose (outfile);
  }

  fclose (infile);
  return 0;
}

#ifdef __STDC__
int check_header (unsigned char *header)
#else
int
check_header (header)
     unsigned char *header;
#endif
{
  static unsigned char methods[] = "h0h1h2h3h4h5zsz5z4";
         /* Known packing methods */

  unsigned char sum = 0, counter;

  if (header[20] > 2)
    return -2;          /* header level is unknown */

  if (header[2] != '-' || header[3] != 'l' || header[6] != '-')
    return -2;          /* the archiving method is unknown */

  for (counter = 0; methods[counter] && 
       memcmp (header + 4, methods + counter, 2); counter += 2);

  if (!methods[counter])
    return -2;          /* the archiving method is unknown */

  if (header[20] == 2)
    return 2;
  /* this version does not check validity of headers of level 2 thoroughly */

  if (*header < 22)
    return -2;          /* the size of the header is too small */

  for (counter = *header; counter--; sum += header[counter + 2]);

  if (sum != header[1])
    return -2;          /* header checksum is wrong */

  return header[20];      /* no faults found; return header level */
}

#ifdef __STDC__
int prepare_list (char *programname)
#else
int
prepare_list (programname)
char *programname;
#endif
{
  unsigned char line[MAXLINE];
  unsigned int i,j,mode,linenumber,linewarn;

  /***********************************************************************
   * The variable mode tells the line interpreter state
   *   0 outside quotes, before the first filename
   *   1 inside the first filename
   *   2 inside the first filename, escape-character '\' given
   *
   *   4 between trailing and leading quotes of the two filenames
   *   5 inside the second filename
   *   6 inside the second filename, escape-character '\' given
   *
   *   8 outside quotes, after the second filename
   ***********************************************************************/

  for(linenumber=1;fgets((char *)line,MAXLINE,stdin);linenumber++) {
    for(j=0; line[j]; j++);
    for(j++; j && line[--j] <= 32;);

    if (!j && *line <= 32)      /* empty lines are skipped */
      continue;

    line[++j]=0;        /* skip trailing blanks */

    if (*line == ';')
      continue;       /* comment lines must begin with a semicolon */

    if (*line != '\"') {
    Warning:  
      fprintf (stderr, "%s: Warning: line %d of input is suspicious.\n",
	       programname, linenumber);
      continue;
    }

    if (!(filelist = (unsigned char *)
	  (length ? realloc(filelist,length + j) : malloc(j)))) {
      fprintf (stderr, "%s: Out of memory.\n", programname);
      return 0;
    }

    for (linewarn=0, i=mode=1, j=length+2; line[i]; i++) {
      if (mode & 2) {  /* in escape-character mode */
	switch(line[i]) {
	case '\"':
	case '\\':
	case '\'':
	case '?':
	  filelist[j++]=line[i];
	  break;
	case 'n':
	  filelist[j++]=10;
	  break;
	case 't':
	  filelist[j++]=9;
	  break;
	case 'v':
	  filelist[j++]=11;
	  break;
	case 'b':
	  filelist[j++]=8;
	  break;
	case 'r':
	  filelist[j++]=13;
	  break;
	case 'f':
	  filelist[j++]=12;
	  break;
	case 'a':
	  filelist[j++]=7;
	  break;
	default:
	  if (line[i] >= '0' && line[i] <= '7') {
	    filelist[j]=(unsigned char)(line[i] - '0');

	    if (line[i+1] >= '0' && line[i+1] <= '7') {
	      filelist[j] = (unsigned char)
		(((unsigned char)filelist[j] << 3) + line[++i] - '0');

	      if (line[i+1] >= '0' && line[i+1] <= '7')
		filelist[j] = (unsigned char)
		  (((unsigned char)
		    filelist[j] << 3) + line[++i] - '0');
	    }

	    j++;

	    break;
	  }

	  if (line[i] == 'x') {
	    if (!is_hex(line[++i]))
	      goto EscError;

	    filelist[j] = hex(line[i]);

	    if (is_hex(line[i+1]))
	      filelist[j] = (unsigned char)
		(((unsigned char)filelist[j] << 4) + hex(line[++i]));

	    j++;

	    break;
	  }

	EscError: 
          if (!(linewarn & 1)) {
	    fprintf (stderr,
		     "%s: Unknown escape sequence in line %d.\n",
		     programname, linenumber);

	    linewarn |= 1;
	  }
	  break;
	}

	mode--;         /* switch the escape mode off */
      } else if (!(mode & 3)) {  /* outside filenames */
	if (line[i] == '\"')
	  mode++;
	else if (!(linewarn & 2) && line[i] != ',' &&
		 line[i] != '\t' && line[i] != ' ') {
	  fprintf (stderr,
		   "%s: Warning: suspicious character in line %d.\n",
		   programname, linenumber);

	  linewarn |= 2;
	}
      } else if (mode & 3) {     /* inside quotes, no escape mode */
	if (line[i] == '\\')
	  mode++;
	else if (line[i] == '\"') {  /* trailing quote */
	  if (mode & 4) {
	    filelist[length+1] = (unsigned char)
	      (j - 2 - length - filelist[length]);
	    mode = 8;
	    break;
	  } else {
	    filelist[length] = (unsigned char)(j - 2 - length);
	    mode = 4;
	  }
	}
	else
	  filelist[j++] = line[i];
      }
    }

    if (mode != 8)
      goto Warning;

    if (line[++i])
      fprintf (stderr, "%s: Warning: line %d is not properly ended.\n",
	       programname, linenumber);

    length=j;
  }

  return 1;
}

#ifdef __STDC__
int is_hex (unsigned char digit)
#else
int
is_hex (digit)
     unsigned char digit;
#endif
{
  if (digit >= '0' && digit <= '9')
    return 1;

  if (digit >= 'A' && digit <= 'F')
    return 1;

  if (digit >= 'a' && digit <= 'f')
    return 1;

  return 0;
}

#ifdef __STDC__
unsigned char hex (unsigned char digit)
#else
unsigned char
hex (digit)
     unsigned char digit;
#endif
{
  if (digit >= '0' && digit <= '9')
    return (unsigned char)(digit - '9');

  if (digit >= 'A' && digit <= 'F')
    return (unsigned char)(digit - 'A' + 10);

  if (digit >= 'a' && digit <= 'f')
    return (unsigned char)(digit - 'a' + 10);

  return 0;
}
