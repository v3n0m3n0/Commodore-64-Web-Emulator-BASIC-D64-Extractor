/*
** scan.c
**
** Handles temporary filenames.
*/

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <dirent.h>
#include <sys/stat.h>
#include <string.h>
#include <malloc.h>

#define _SCAN_C_
#include "scan.h"

#define FILE_PREFIX "FILE"   /* use upper case to avoid case conversions */
#define FILE_PREFIX_LENGTH 4
#define FILE_PATTERN "FILE%05u" /* pattern for filenames */
#define FILE_PATTERN_LENGTH 9

unsigned int NextValue = 0, PathLength;
char *filename, *tempname;

#ifndef __STDC__
int
scan(Name, Directory)
     char *Name;
     char *Directory;
#else
int scan (const char *Name, const char *Directory)
#endif
{
  DIR *dir;
  struct dirent *dirp;
  struct stat statbuf;
  char cwd_save[2048]; /* ought to be enough */
  unsigned int sum, counter;
  int ReturnCode = 0;

  PathLength = Directory ? strlen (Directory) : 0;

  if (PathLength && Directory[PathLength - 1] != '/')
    PathLength++;

  if (!(filename = (char *)malloc (PathLength + 1 + FILE_PATTERN_LENGTH))) {
    fprintf (stderr, "%s: Out of memory.\n", Name);
    return 3;
  }

  sprintf (filename, "%s/", Directory);
  tempname = filename + PathLength;

  if (Directory) {
    getcwd (cwd_save, sizeof cwd_save);

    if (chdir (Directory))
      goto OpenError;
  }

  if (!(dir = opendir ("."))) {
  OpenError:
    fprintf (stderr, "%s: Error in opening the directory.\n", Name);
    return 1;
  }

  for (; (dirp = readdir (dir)) && stat (dirp -> d_name, &statbuf) >= 0; )
    if (strlen(dirp -> d_name) == FILE_PATTERN_LENGTH &&
	!strncmp (dirp -> d_name, FILE_PREFIX, FILE_PREFIX_LENGTH)) {
      for (sum = 0, counter = FILE_PREFIX_LENGTH;
	   counter < FILE_PATTERN_LENGTH;
	   counter++)
	if (dirp -> d_name[counter] < '0' || dirp -> d_name[counter] > '9') {
	  sum = 0;
	  break;
	}
	else
	  sum = 10*sum + dirp -> d_name[counter] - '0';

      if (!sum || !S_ISREG (statbuf.st_mode)) {
	fprintf (stderr, "%s: Reserved filename in use.\n", Name);
	ReturnCode = 2;
	break;
      }

      if (sum > NextValue)
	NextValue = sum;
    }

  if (closedir (dir) || (Directory && chdir (cwd_save))) {
    fprintf (stderr, "%s: Error in closing the directory.\n", Name);
    return 2;
  }

  return ReturnCode;
}

#ifndef __STDC__
char
*nexttemp()
#else
char *nexttemp (void)
#endif
{
  sprintf (tempname, FILE_PATTERN, ++NextValue);

  return filename;
}
