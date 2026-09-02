static char info[]=" D64 2 Zipcode   Version 1.0   Tony Ambardar (C) 1993\n";
/*
Wrote this mostly by looking through some zipcode 4-packs and playing with
Zipcode 2.0, so that I could try .D64 software from the watson archive on
my C64 at home. No guarantees.

You are free to re-use this code so long as you give credit where it's due.

(C) 1993     Tony Ambardar
*/

#include <stdio.h>
#include <errno.h>
#include <string.h>

#define DBLOCKS (683)

typedef unsigned char byte;
typedef enum { WHOLE=0, VARIABLE, NONE } repeat_t;
static char repeat_c[]=".oO";

byte image_buffer[DBLOCKS*256],max_sector[35];
static byte trk_lims[4] = {0, 8, 16, 25};

/* Per sector info */

int num_repeats;
byte repchar;
int rle_len;
struct {
       int startpos;
       int len;
       } rep_info[64];
       
static char filename[255] = "0!";

FILE *imgfile,*zipfile;

main(int argc, char *argv[]) {

   repeat_t rep_scan();
   byte *sec_buf;
   int i,j,k,track, sector,base;
   int oddadd,evenadd,begin,length;
   
   repeat_t sec_type;
   
   if(argc != 3) {
      printf("%s",info);
      printf("Converts a .D64 disk image to a Zipcode 4-pack\n\n");      
      printf("Usage: %s  diskimage.d64   zipfilename\n",argv[0]);
      exit(0);
      }

   init_stuff(argv[1]);
   
   zipfile = NULL;
   strcat(filename,argv[2]);
   base=0;
   oddadd=11, evenadd= -10;
   printf("\n            RLE Compression Map:\n");
   printf("O = No Compression  -->  . = Max. Compression\n");
   for(track=0; track<35; base+=max_sector[track++]+1) {
      printf("\nTrack: %2u ",track+1);
      openfiles(track,filename);
      if(track==17 || track==24) --oddadd, ++evenadd;
      i=base-evenadd;
      sector= -evenadd;
      for(k=0; k <= max_sector[track]; k++) {
         i+= k % 2 ? oddadd : evenadd;
         sec_buf = image_buffer +i*256;
         sector += k % 2 ? oddadd : evenadd;
         sec_type = rep_scan(sec_buf);
         printf("%c",repeat_c[sec_type]);

#ifdef EBUG1
printf("\nT: %2u S: %2u Type: %c  Repchar: %3u\n",track+1,sector,
repeat_c[sec_type],repchar);
#endif

#ifdef EBUG2
for(j=0;j<256;j++)
   printf("\\%3o",*(sec_buf+j));
#endif   

         if(sec_type==NONE) {
            fputc(track+1,zipfile),fputc(sector,zipfile);
            fwrite((sec_buf),1,256,zipfile);
            }
         else if(sec_type==WHOLE) {
            fputc(track+1+64,zipfile),fputc(sector,zipfile);
            fputc(*(sec_buf),zipfile);
            }
         else {  /* VARIABLE */
            fputc(track+1+128,zipfile),fputc(sector,zipfile);
            fputc(rle_len,zipfile),fputc(repchar,zipfile);
            for(j=0; j<num_repeats; j++) {
               begin= j==0? 0 : 
               rep_info[j-1].startpos+rep_info[j-1].len;
               length = rep_info[j].startpos - begin;
               fwrite((sec_buf+begin),1,length,zipfile);
               fputc(repchar,zipfile),
               fputc(rep_info[j].len,zipfile);
               fputc(*(sec_buf+rep_info[j].startpos),zipfile);
               }
            begin=rep_info[j-1].startpos+rep_info[j-1].len;
            length = 256 - begin;
            fwrite((sec_buf+begin),1,length,zipfile);
            }
      }
   }
   printf("\n\nDone.\n");
   close(zipfile);
}

openfiles(int trk,char *name)
{
   int i;
   for(i=0; i<4; i++)
      if(trk_lims[i] == trk) {
         if(zipfile != NULL) fclose(zipfile);
         ++*name;
         if(!(zipfile = fopen(name,"w"))) {
            perror(name);
            exit(errno);
            }
/*  Write headers. \041 \041 is a disk ID I think */
            
         if(i==0) fputs("\376\003\041\041",zipfile);
         else fprintf(zipfile,"%c%c",0,4);
      }
}


init_stuff(char *name)
{
   int i;

   for(i=0; i<17; max_sector[i++]=20);
   for(i=17; i<24; max_sector[i++]=18);
   for(i=24; i<30; max_sector[i++]=17);
   for(i=30; i<35; max_sector[i++]=16);
   
   if(!(imgfile = fopen(name,"r"))) {
      perror(name);
      exit(errno);
   }
   else {
      if(fread(image_buffer,1,sizeof(image_buffer),imgfile) 
         != sizeof(image_buffer)) {
         fprintf(stderr,"D64 image could be wrong size!\n");
         exit(1);
         }
      close(imgfile);
   }
}
               
repeat_t rep_scan(byte *sec_buf)
{
   int i,j,count;
   char table[256];

   rle_len=256;
   num_repeats=0;
      
   for(i=0; i<255; i++) {
      count=0;
      while(i<255 && *(sec_buf+i)==*(sec_buf+i+1)) {
         i++,count++;
         }
      if(count >= 3) {
         rep_info[num_repeats].startpos=i-count;
         rep_info[num_repeats].len=count+1;
         ++num_repeats;
         }         
      }
   if(num_repeats==0) return NONE;
   else
   if(count==255) return WHOLE;

/*  VARIABLE  */

   rle_len += num_repeats*3;
   for(i=0; i< num_repeats; i++)
      rle_len -= rep_info[i].len;
   if(rle_len >253) return NONE;
      
   for(j=0; j<256; table[j++]=1);
   for(j=0; j<256;  table[*(sec_buf+j++)]=0);
   for(j=0; j<256 && table[j]==0; j++);
   repchar = j;
   
#ifdef EBUG1
printf("\nRepeats: %2u RLE_len: %3u Repchar: %3u\n",i,rle_len,j);
for(j=0;j<i;j++)
   printf("Start: %3u Length: %3u\n",rep_info[j].startpos,rep_info[j].len);
#endif   
   return VARIABLE;   
}

