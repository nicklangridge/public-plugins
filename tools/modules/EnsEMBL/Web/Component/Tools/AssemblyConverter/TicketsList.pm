=head1 LICENSE

Copyright [1999-2015] Wellcome Trust Sanger Institute and the EMBL-European Bioinformatics Institute
Copyright [2016-2017] EMBL-European Bioinformatics Institute

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

=cut

package EnsEMBL::Web::Component::Tools::AssemblyConverter::TicketsList;

use strict;
use warnings;

use parent qw(
  EnsEMBL::Web::Component::Tools::AssemblyConverter
  EnsEMBL::Web::Component::Tools::TicketsList
);

sub job_status_tag {
  ## @override
  ## Remove link from the status tag of finished jobs
  my $self    = shift;
  my $status  = $_[1];
  my $job     = $_[0];  
  my $tag     = $self->SUPER::job_status_tag(@_);
  my $output  = $job->dispatcher_data->{work_dir}."/".$job->dispatcher_data->{config}->{output_file};

  if ($status eq 'done') {
    $tag->{'title'} = q(This job is finished. Please click on the 'Download&nbsp;results' link to download result file.);
    $tag->{'href'}  = '';
  } 

  # Before the below was in the runnable and the job was reported as failed which was confusing, moved it to here
  # CrossMap's error reporting is poor, so check it produced actual output which means that either there is no mapped data or the data is invalid. 
  if ($status eq 'done' && (!(-e $output) || !(-s $output))) {
    $tag->{'inner_HTML'} = "Done: No data found";
    $tag->{'class'} = [ 'job-status-noresult', grep { $_ ne 'job-status-done' } @{$tag->{'class'}} ];
    $tag->{'title'} = 'This job is finished, but no results were obtained. This could either be because there is an error in your input data or because no mapping of coordinates were found.';
    $tag->{'href'}  = '';    
  }

  return $tag;
}

sub job_summary_section {
  ## @override
  ## Change text and link of the results link
  my $self      = shift;
  my $ticket    = $_[0];
  my $output    = $ticket->job->[0]->dispatcher_data->{work_dir}."/".$ticket->job->[0]->dispatcher_data->{config}->{output_file};
  my $summary   = $self->SUPER::job_summary_section(@_);

  foreach (@{$summary->get_nodes_by_flag('job_results_link') || []}) {
    if(-e $output && -s $output) {
      $_->inner_HTML('[Download results]');
      $_->set_attribute('href', $self->object->download_url($ticket->ticket_name));
    } else {
      $_->inner_HTML('');
    }
  }
  
  return $summary;
}

sub ticket_buttons {
  ## @override
  ## Add an extra download icon for finished jobs
  my $self      = shift;
  my $ticket    = $_[0];
  my $buttons   = $self->SUPER::ticket_buttons(@_);
  my ($job)     = $ticket && $ticket->job;
  my $output    = $job->dispatcher_data->{work_dir}."/".$job->dispatcher_data->{config}->{output_file};

  #only provide the download icon when there is an output file and it is not empty
  if ($job && $job->dispatcher_status eq 'done' && -e $output && -s $output) {
    $buttons->prepend_child({
      'node_name'   => 'a',
      'class'       => [qw(_download)],
      'href'        => $self->object->download_url($ticket->ticket_name),
      'children'    => [{
        'node_name'   => 'span',
        'class'       => [qw(_ht sprite download_icon)],
        'title'       => 'Download output file'
      }]
    });
  }

  return $buttons;
}

1;
