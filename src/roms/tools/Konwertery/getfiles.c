;/*
sc DisAsm=ram:getfiles.s NoCheckAbort getfiles.c ProgramName=getfiles ObjectName=ram: Ignore=73+306 GST=include:all.gst GSTImm NoIcon NoStackCheck UnsignedChar Parm=Register Opt OptSched OptInLocal OptDep=100 OptRDep=100 CommentNest Link
quit
*/

/*
1541 disk-image-to-files converter
Copyright © 1994 by Dan Babcock

Compiled with SAS/C V6.51
*/

typedef short bool; /* enum bool { FALSE, TRUE }; */

/* Buffers */
#define DISKSIZE 683*256
static __far char DiskImage[DISKSIZE];
static usedsecs[683];

/* Command line parsing */
enum cmdargs { FILENAME, DIROPT, EXT, NUMARGS };
static struct RDArgs *rdargs;
static LONG args[NUMARGS];

/* Misc */
static char ver[]="$VER: getfiles 1.00 (16.6.94)\n";
long __OSlibversion = 37;


/* Returns the address (somewhere in DiskImage) corresponding to a given track and
   sector, or NULL if the track/sector pair is invalid.
*/
static char *GetTSAddress(unsigned track, unsigned sector)
{
	unsigned sec;

	if (track<1 || track>35 || sector>20)
		return NULL;

	if (track < 18)	/* zone 1 */
		sec=(track-1)*21+sector;
	else if (track < 25)	/* zone 2 */
		sec=357+(track-18)*19+sector;
	else if (track < 31)	/* zone 3 */
		sec=490+(track-25)*18+sector;
	else	/* zone 4 */
		sec=598+(track-31)*17+sector;

	if (sec>=683) return NULL;
	if (usedsecs[sec]) return NULL; /* circular link or other weirdness */
	usedsecs[sec]=1;
	return DiskImage+(sec*256);
}

/* Dumps the indicated file to disk */
static void DumpFile(char track, char sector, char *file)
{
	struct datablock {
		char nexttrack; /* or 0 for last sector */
		char nextsector; /* or "N-1 data bytes on this sector" */
		char data[254];
	};

	struct datablock *data;
	BPTR fh;
	LONG length;
	unsigned i;
	bool illegal=FALSE;

	data=(struct datablock*)GetTSAddress(track, sector);
	if (data==NULL) {
		printf("        Invalid sector pointer - skipped\n");
		return;
	}

	/* Open output file. But first, scan for illegal characters and replace as
       appropriate. */
	for (i=0; file[i]; i++) {
		switch (file[i]) {
			case '/':
				file[i]='\\';
				illegal=TRUE;
				break;
			case ':':
				file[i]=';';
				illegal=TRUE;
				break;
			default:
				if (file[i]<=0x1F || (file[i]>=0x7F && file[i]<=0x9F)) {
					file[i]='-';
					illegal=TRUE;
				}
				break;
		}
	}
	if (illegal)
		printf("        Illegal file name changed to \"%s\"\n",file);

	fh=Open(file,MODE_NEWFILE);
	if (fh==0) {
		printf("        Can't create file\n");
		return;
	}

	while (data->nexttrack) {
		length=Write(fh,data->data,254);
		if (length != 254) {
			printf("        Error writing file\n");
			Close(fh);
			return;
		}
//		printf("        Next: track %d, sector %d\n",(int)data->nexttrack,(int)data->nextsector);
		data=(struct datablock*)GetTSAddress(data->nexttrack,data->nextsector);
		if (data==NULL) {
			printf("        Invalid sector pointer - aborted\n");
			Close(fh);
			return;
		}
	}

	if (strncmp(data->data,"LAZARUS",7)==0) {
		printf("        File contains bad sector (corrupt)\n");
	}

	if (data->nextsector >= 2) {
		length=Write(fh,data->data,data->nextsector-1);
		if (length != data->nextsector-1) {
			printf("        Error writing file\n");
		}
	}
	else {
		printf("        Invalid sector length - file probably truncated\n");
	}

	Close(fh);
}


/* Get a 1541 name (up to 16 characters padded with $A0) and place in a normal
   C string.
*/
static void Get1541Name(char *dest, const char *source)
{
	int i;

	for (i=0; (source[i] != 0xA0) && (i <= 15); i++) {
		dest[i]=source[i];
	}
	dest[i]=0;
}

/* Scans through the directory blocks calling DumpFile() as appropriate */
static void Dump(void)
{
	struct BAM {
		char startdirtrack;
		char startdirsector;
		char format;	/* ASCII "A" */
		char notused1[1];
		char bam[140];
		char diskname[16];
		char shiftedspaces[2];
		char diskid[2];
		char shiftedspace[1];
		char dosversion[2];
		char shiftedspaces2[4];
		char notused2[85];
	};
	struct FileEntry {  /* repeated 8 times per sector */
		char dirtrack;  /* chain: only valid for first entry */
		char dirsector; /* chain: only valid for first entry */
		char type;      /* file type */
		char track;     /* start of file */
		char sector;
		char name[16];   /* file name padded with 0xA0 */
		char notused[11];
	};
	struct BAM *BAM;
	struct FileEntry *dir;
	char track, sector;
	char diskname[17];
	unsigned i;

	/* initialize usedsecs[] to zero */
	for (i=0; i <= 682; i++)
		usedsecs[i]=0;

	BAM=(struct BAM*)GetTSAddress(18,0);
	Get1541Name(diskname,BAM->diskname);
	printf("    Disk name: %s\n",diskname);

	for (track=BAM->startdirtrack, sector=BAM->startdirsector;
	     dir=(struct FileEntry*)GetTSAddress(track, sector);
	     track=dir[0].dirtrack, sector=dir[0].dirsector) {
		int entry;
		for (entry=0; entry <= 7; entry++) {
			if (dir[entry].type != 0) {
				char filename[21];
				char ext[4];
				Get1541Name(filename,dir[entry].name);
				switch (dir[entry].type & ~(1<<6)) {
					case 0x80:
						strcpy(ext,"DEL");
						break;
					case 0x81:
						strcpy(ext,"SEQ");
						break;
					case 0x82:
						strcpy(ext,"PRG");
						break;
					case 0x83:
						strcpy(ext,"USR");
						break;
					case 0x84:
						strcpy(ext,"REL");
						break;
					default:
						printf("    Skipped file \"%s\" of unknown type $%x\n",filename,(int)dir[entry].type);
						continue;
					}
				printf("    %-17s%s\n",filename,ext);
				if (args[EXT]) {
					strcat(filename,".");
					strcat(filename,ext);
				}
				if (!args[DIROPT])
					DumpFile(dir[entry].track,dir[entry].sector,filename);
			}
		}
	}
}

/* Reads in image file, creates and changes to a new directory for the file dump,
   and calls Dump()
*/
static void Convert(const char *filename)
{
	static char newdirname[100];
	static char error[100];
	char *period;
	BPTR dir, olddir;
	BPTR imagefile;
	LONG size;

	/* read in image file */
	imagefile=Open((char*)filename,MODE_OLDFILE);
	if (imagefile==0) {
		printf("Couldn't open file %s\n",filename);
		return;
	}
	size=Read(imagefile,DiskImage,DISKSIZE);
	Close(imagefile);
	if (size != DISKSIZE) {
		printf("Couldn't read file %s\n",filename);
		return;
	}

	printf("Converting %s\n",filename);

	if (args[DIROPT]) {
		Dump();
		return;
	}

	/* form directory name (add ".files", omit ".#?") */
	strcpy(newdirname,filename);
	period=strchr(newdirname,'.');
	if (period==0) period=newdirname+strlen(newdirname);
	strcpy(period,".files");

	/* create directory */
	dir=CreateDir(newdirname);
	if (dir==0) {
		printf("    Couldn't create directory %s ",newdirname);
		Fault(IoErr(),"",error,100);
		printf("%s\n",error);
		return;
	}

	olddir=CurrentDir(dir);
	Dump();
	CurrentDir(olddir);
	UnLock(dir);
}

/* Uses pattern matching routines to find files and calls Convert() */
void main(void)
{
	static struct AnchorPath MyAp;
	LONG match;
	BPTR olddir;

	printf("getfiles - Copyright © 1994 by Dan Babcock\n");

	/* Handle command-line arguments */
	rdargs=ReadArgs("FILENAME/A,DIR/S,EXT=EXTENSIONS/S",args,0);
	if (rdargs == 0) {
		printf("Invalid parameters\n");
		return;
	}

	MyAp.ap_BreakBits = SIGBREAKF_CTRL_C; /* Break on these bits */
	for (match=MatchFirst((char*)args[FILENAME],&MyAp); match==0; match=MatchNext(&MyAp)) {
		if ((MyAp.ap_Info.fib_DirEntryType < 0) && (MyAp.ap_Info.fib_Size==DISKSIZE)) {
			olddir=CurrentDir(MyAp.ap_Current->an_Lock);
			Convert(MyAp.ap_Info.fib_FileName);
			CurrentDir(olddir);
		}
	}
	MatchEnd(&MyAp);
	FreeArgs(rdargs);
}
