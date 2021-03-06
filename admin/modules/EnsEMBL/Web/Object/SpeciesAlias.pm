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

package EnsEMBL::Web::Object::SpeciesAlias;

use strict;

use parent qw(EnsEMBL::Web::Object::DbFrontend);

### ### ### ### ### ### ### ### ###
### Inherited method overriding ###
### ### ### ### ### ### ### ### ###

sub fetch_for_list {
  ## @overrides
  my $self = shift;
  $self->SUPER::fetch_for_list(@_);
  $self->_sort_rose_objects;
}

sub fetch_for_display {
  ## @overrides
  my $self = shift;
  $self->SUPER::fetch_for_display(@_);
  $self->_sort_rose_objects;
}

sub manager_class {
  ## @overrides
  return shift->rose_manager(qw(Production SpeciesAlias));
}

sub show_fields {
  ## @overrides
  my $self = shift;
  return [
    species           => {
      'type'      => 'dropdown',
      'label'     => 'Species name',
      'required'  => 1,
    },
    alias             => {
      'type'      => 'string',
      'label'     => 'Alias',
      'required'  => 1,
    }
  ];
}

sub show_columns {
  ## @overrides
  return [
    species         => {'title' => 'Species', 'ensembl_object' => 'Species'},
    alias           => 'Alias',
  ];
}

sub record_name {
  ## @overrides
  return {
    'singular' => 'species alias',
    'plural'   => 'species aliases'
  };
}

sub permit_delete {
  ## @overrides
  ## Record can not be deleted, but can be set inactive
  return 'retire';
}

sub _sort_rose_objects {
  ## @private
  ## Sorts the rose object wrt the species name
  my $self = shift;
  $self->rose_objects([ sort { $a->species->get_title cmp $b->species->get_title } @{$self->rose_objects} ]);
}

1;
