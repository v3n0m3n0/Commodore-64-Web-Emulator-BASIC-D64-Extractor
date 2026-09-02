
/*******************************************************************/
/** Tape2Bin                                                      **/
/** Extracts the first program in a .t64 file and stores it as a  **/
/** binary file that should be loadable by a real C64 or A64 for  **/
/** the Amiga.  Note, this won't work if the .t64 file has more   **/
/** than one file in it.                                          **/
/**                                                               **/
/** All I did was convert the pascal source to C.  If I get time  **/
/** I'll covert the other utilities and expand this one to do     **/
/** multiple files.  This source SHOULD compile on any C compiler **/
/** but I've only tested it with SAS C for the Amiga.             **/
/**                                                               **/
/**                                     Leon                      **/
/*******************************************************************/

#include <stdio.h>
#include <errno.h>

long Temp_Integer;
unsigned char My_Byte;
FILE *Input_File, *Output_File;

int main(int argc, char *argv[]) {

     if(argc < 3) {
          printf("This program restores BIN files from T64 files.\n");
          printf("Format: t64tobin <Input_File.T64> <Output_File>\n");
          printf("Written (in pascal) for MSDOS BY WERNER ZSOLT.\n");
          printf("Converted to C by Leon Atkinson 3/2/94\n");
          exit(0);
          }

     Input_File = fopen(argv[1], "rb");
     if(Input_File == NULL) {
          perror("Can't open input file");
          exit(errno);
          }

     Output_File = fopen(argv[2], "wb");
     if(Output_File == NULL) {
          perror("Can't create output file");
          exit(errno);
          }

     if(fseek(Input_File, 0x42, 0)) { /* reading back the first two bytes */
          perror("Error on fseek");
          exit(errno);
          }
     fread(&My_Byte, sizeof(unsigned char), 1, Input_File);
     fwrite(&My_Byte, sizeof(unsigned char), 1, Output_File);
     fread(&My_Byte, sizeof(unsigned char), 1, Input_File);
     fwrite(&My_Byte, sizeof(unsigned char), 1, Output_File);

     if(fseek(Input_File, 1024, 0)) {
          perror("Error on fseek");
          exit(errno);
          }
     do {
          fread(&My_Byte, sizeof(unsigned char), 1, Input_File);
          fwrite(&My_Byte, sizeof(unsigned char), 1, Output_File);
          } while(!(feof(Input_File)));

     fclose(Output_File);
     fclose(Input_File);
     }

