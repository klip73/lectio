package CGI;
# Minimal stand-in for CGI.pm: parameters from the command line (key=value), no cookies, no headers.
sub new { my %p; for (@ARGV) { my ($k, $v) = split /=/, $_, 2; $p{$k} = $v; } return bless { p => \%p }, shift; }
sub param { my ($s, $k) = @_; return keys %{$s->{p}} unless defined $k; return $s->{p}{$k}; }
sub cookie { return ''; }
sub header { return ''; }
1;
