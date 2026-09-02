#ifndef _SCAN_C_
extern char *tempname;
#endif

#ifdef __STDC__
int scan (const char *Name, const char *Directory);
char *nexttemp (void);
#else
int scan ();
char *nexttemp ();
#endif
