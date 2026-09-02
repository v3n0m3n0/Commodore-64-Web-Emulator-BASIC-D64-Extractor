{$M 16384,0,0}
type blocktype=array [0..255] of byte;

var track, sector, max_sector: byte;
    infile, outfile: file;
    track_data: array [0..8192] of byte;
    sector_flag: array [0..20] of byte;
    i, block_count: integer;

function read_sector (var f: file; track: byte): integer;
label Error;
var trk, sec, max_sec, len, rep, repnum, chra: byte;
    i, j, count: integer;
begin
  blockread (f, trk, 1);
  blockread (f, sec, 1);
  if ((trk and 63) <> track) or (sector_flag [sec] <> 0) or (sec > max_sector) then
  begin

Error:
    read_sector:=1;
    writeln ('File is corrupted.');
    exit;
  end;

  sector_flag [sec]:=1;
  if ((trk and 128) = 128) then
  begin
    write ('1');
    blockread (f, len, 1);
    blockread (f, rep, 1);
    count:=0;
    for i:=0 to len-1 do
    begin
      if (eof (f)) then goto Error;
      blockread (f, chra, 1);
      if (chra <> rep) then
      begin
        track_data [sec shl 8+count]:=chra;
        inc (count);
      end else
        begin
          blockread (f, repnum, 1);
          if (eof (f)) then goto Error;
          blockread (f, chra, 1);
          i:=i+2;
          for j:=0 to repnum-1 do
          begin
            track_data [sec shl 8+count]:=chra;
            inc (count);
          end;
        end;
    end;
  end else
  if ((trk and 64) = 64) then
  begin
    write ('2');
    if (eof (f)) then goto Error;
    blockread (f, chra, 1);
    fillchar (track_data [sec shl 8], 256, chra);
  end else
  begin
    write ('3');
    blockread (f, track_data [sec shl 8], 256, i);
    if (i<>256) then goto Error;
  end;
  read_sector:=0;
end;

function openfile (p:byte): integer;
begin
  if (p>1) then close (infile);
  assign (infile, chr (p+48)+'!'+paramstr (1));
  {$I-}
  reset (infile, 1);
  if (ioresult<>0) then
  begin
    writeln ('Error opening file');
    openfile:=1;
    exit;
  end;
  {$I+}
  if (p=1) then seek (infile, 4) else seek (infile, 2);
  openfile:=0;
end;

label Error, Error2;
begin
  writeln;
  writeln ('ZipCode 2 D64 - Extract Zipcode disks to C64S .D64 images');
  if (paramcount<>2) then
  begin
    writeln ('Usage: zip2d64 <zipcode file> <d64 image>');
  end else
  begin
    if (pos ('.d64', paramstr (2)) > 0) then assign (outfile, paramstr (2)) else
      assign (outfile, paramstr (2)+'.D64');
    rewrite (outfile, 1);

    block_count:=0;
    for track:=1 to 35 do
    begin
      fillchar (track_data, sizeof (track_data), 0);
      if (track>=1) and (track<=17) then max_sector:=20;
      if (track>=18) and (track<=24) then max_sector:=18;
      if (track>=25) and (track<=30) then max_sector:=17;
      if (track>=31) and (track<=35) then max_sector:=16;

      case track of
        1: if (openfile (1) <>0) then goto Error2;
        9: if (openfile (2) <>0) then goto Error2;
        17: if (openfile (3) <>0) then goto Error2;
        26: if (openfile (4) <>0) then goto Error2;
      end;

      fillchar (sector_flag, sizeof (sector_flag), 0);
      write ('Track ', track,' ');
      for sector:=0 to max_sector do
      begin
        inc (block_count);
        if (read_sector (infile, track) <>0) then goto Error;
      end;
      blockwrite (outfile, track_data, max_sector*256+256);
      writeln;
    end;

    close (infile);
    close (outfile);
  end;
  exit;

  Error:  
    close (infile);
  Error2:
    close (outfile);
    halt (2);
end.

