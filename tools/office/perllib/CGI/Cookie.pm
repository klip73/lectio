package CGI::Cookie;
sub fetch { return (); }
sub new { return bless {}, shift; }
sub value { return ''; }
1;
