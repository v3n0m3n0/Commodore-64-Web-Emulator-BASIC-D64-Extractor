;/*
sc DisAsm=ram:speed.s math=standard NoCheckAbort speed.c ProgramName=speed ObjectName=ram: Ignore=73+306 GST=include:all.gst GSTImm NoIcon NoStackCheck UnsignedChar Parm=Register Opt OptSched OptInLocal OptDep=100 OptRDep=100 CommentNest Link
quit
*/

/*
Disk speed checker

Compiled with SAS/C V6.51
*/

WORD AbleICR(long mask);
WORD SetICR(long mask);
#pragma libcall CiaBase AbleICR 12 001
#pragma libcall CiaBase SetICR 18 001

/* Command line parsing */
enum cmdargs { DRIVE, NUMARGS };
static struct RDArgs *rdargs;
static LONG args[NUMARGS];

/* Misc */
struct Library *DiskBase;
struct Library *CiaBase;
struct Library *TimerBase;
BYTE signum;
ULONG sigmask;
struct Task *MyTask;
extern struct ExecBase *SysBase;
static struct MsgPort *port;
struct EClockVal currenttime;
ULONG TicsPerSecond;

/* for reference
struct EClockVal {
    ULONG ev_hi;
    ULONG ev_lo;
};
*/

static __saveds void IndexInt(void)
{
	TicsPerSecond=ReadEClock(&currenttime);
	Signal(MyTask,sigmask);
}

void main(void)
{
	static struct DiscResourceUnit diskunit; /* initialized to zero because of static */
	volatile struct CIA *ciab=(void*)0xbfd000;
	struct IORequest io;
	struct EClockVal oldtime;
	ULONG sigs;

	/* Handle command-line arguments */
	rdargs=ReadArgs("DRIVE/N/A",args,0);
	if (rdargs == 0) {
		printf("Invalid parameters\n");
		return;
	}

	/* check whether the drive# is valid by opening trackdisk */
	if (OpenDevice("trackdisk.device", *(int *)args[DRIVE], &io, TDF_ALLOW_NON_3_5)) {
		printf("Could not open trackdisk unit %d\n",*(int *)args[DRIVE]);
		FreeArgs(rdargs);
		return;
	}
	CloseDevice(&io);

	if ((port = CreateMsgPort())==0) {
		printf("Could not create message port (out of memory)\n");
		FreeArgs(rdargs);
		return;
	}

	DiskBase=OpenResource("disk.resource");
	CiaBase=OpenResource("ciab.resource");
	signum=AllocSignal(-1);
	if (signum==-1) {
		printf("Can't allocate signal bit\n");
		FreeArgs(rdargs);
		return;
	}
	sigmask=1<<signum;
	MyTask=SysBase->ThisTask;

	OpenDevice("timer.device", 0, &io, 0);
	TimerBase=(struct Library*)io.io_Device;

	printf("Note: you must place a disk (may be write-protected) in unit %d\n",*(int *)args[DRIVE]);

	/* get disk.resource */
	diskunit.dru_Index.is_Code=&IndexInt;
	diskunit.dru_Index.is_Node.ln_Name="speed check index";
	diskunit.dru_Message.mn_ReplyPort=port;
	diskunit.dru_Message.mn_Node.ln_Name="speed check";
	while (!GetUnit((struct DiskResourceUnit*)&diskunit)) {
		WaitPort(port);
		GetMsg(port); /* important! remove message */
	}

	/* set up CIA bits, turn on motor, wait for motor */
	ciab->ciaprb |= CIAF_DSKSEL0|CIAF_DSKSEL1|CIAF_DSKSEL2|CIAF_DSKSEL3;
	ciab->ciaprb &= ~CIAF_DSKMOTOR;
	ciab->ciaprb &= ~(1<<(*(int *)args[DRIVE]+3));

	/* enable index int */
	SetICR(16); /* clear interrupt */
	AbleICR(16+128); /* enable interrupt */

	sigs=Wait(sigmask | SIGBREAKF_CTRL_C);
	if (sigs & SIGBREAKF_CTRL_C) goto ControlC;

	oldtime=currenttime;
	while (1) {
		double rpm;

		sigs=Wait(sigmask | SIGBREAKF_CTRL_C);
		if (sigs & SIGBREAKF_CTRL_C) break;

		/* compute time difference (currenttime-oldtime) and print RPM */
		if (currenttime.ev_hi==oldtime.ev_hi)
			rpm = currenttime.ev_lo-oldtime.ev_lo;
		else
			rpm = (4294967296.0+currenttime.ev_lo)-oldtime.ev_lo;
		oldtime=currenttime;
		rpm = 60.0/(rpm/TicsPerSecond);
		printf("RPM: %.3f\n",rpm);
	}

ControlC:
	/* motor off */
	ciab->ciaprb |= CIAF_DSKSEL0|CIAF_DSKSEL1|CIAF_DSKSEL2|CIAF_DSKSEL3;
	ciab->ciaprb |= CIAF_DSKMOTOR;
	ciab->ciaprb &= ~(1<<(*(int *)args[DRIVE]+3));

	AbleICR(16); /* disable interrupt */
	SetICR(16); /* clear interrupt */
	GiveUnit();
	CloseDevice(&io);
	FreeSignal(signum);
	FreeArgs(rdargs);
}

