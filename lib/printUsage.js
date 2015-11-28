'use strict';

let consts = require('./consts');

module.exports = function printUsage(pkg) {
  console.log(`
${ pkg.name } v${ pkg.version } - ${ pkg.description }

Usage: ${pkg.name } [--list] [--host <host>]

  --list          Builds and lists the dynamic inventory
  --host <host>   Retrieves hostvars for the specified host

This utility was created to provide a flexible, configurable tool for building dynamic inventories for Ansible, according to ansible's documentation:

http://docs.ansible.com/ansible/developing_inventory.html

An options file is required in order to query your resources on the Google Cloud. You can indicate the location of the options file by setting an environment variable GCE_OPTIONS.

If no environment variable is present, the utility will probe the working directory for a file named '${ consts.GCE_OPTIONS_FILENAME }'.

If the options file is not found in the working directory, the utility will recursively probe the parent directory for the same file until it is found or the root directory has been probed.

The options file contains information and instructions in yaml format, for example:

  ---
  projectId: ll-dev
  keyFileName: /home/phillip/LL-DEV-eb3980327059.json

  zones:
    - us-central1-a

  hostvars:
    - id
    - status:
      transform: lowercase
    - network: /networkInterfaces/0/network
      captureRe: '[^/]+(?=/$|$)'
    - internalIP: /networkInterfaces/0/networkIP
    - externalIP: /networkInterfaces/0/accessConfigs/0/natIP
    - tags: /tags/items
    - metadata: /metadata/items
      transform: objectFromKeyValues
    - machine_type: /machineType
      captureRe: '[^/]+(?=/$|$)'

  ansible_ssh_host: /externalIP

  groups:
    - zone
    - tags:
      pointer: /tags
      prepend: 'tags-'
    - status
    - machine_type

  order:
    - hosts
    - zone
    - tags
    - machine_type
    - status

'${ consts.GCE_OPTIONS_FILENAME }' sections:

  projectId     Identifies the gce project.
  keyFileName   Full path to the service credentials that have authority to query the google cloud api for the specified project.

  zones         Lists the gce zones that should be queried. If none are specified then all zones are queried.

  hostvars      Lists of property names and optionally, a specification indicating how the property is derived.

                Items appearing in the hostvar list may be simple strings or objects.

                If the list item is a string, it is interpreted as both source and target property name; example:

                hostvar:
                   - id

                This declaration would cause the 'id' property of each gce instance's metadata to be copied to the host's hostvars in the output.

                If the list item is an object, the first property of the object declares the target and source property. Targets are always simple property names. Sources are encoded as JSON Pointers to the value, relative to each instance's metadata:

                hostvar:
                  - internalIp: /networkInterfaces/0/networkIP

                This declaration indicates that a host's hostvar should be extracted from the gce instance's metadata at the JSON Pointer '/netowrkInterfaces/0/networkIP'.

                Furthermore, if the list item is an object, it may declare a transform that is performed on the source's value before it is assigned to the target.

                Transform declarations:

                  transform: <transform-method>
                  captureRe: <regular-expression-capture>

                <transform-method> must be one of the following:

                  lowercase - transforms the value to lower case
                  uppercase - transforms the value to upper case

                  objectFromKeyValues - transforms one or more object values into properties; intended for use with metadata or tags.

                Since pointers are relative to the gce instance's data as returned by the Google Compute Engine API, you should refer to the API's documentation to ensure your pointers are accurate as their API evolves. You may also run the util in debug mode to see the structure of source instances:

                > DEBUG=gce* gce-util --list

                The debug output should make the sequence of events and transforms pretty clear.
 groups        List of group names corresponding to the properties of each host's hostvars that are used for constructing groups in the output.

                If the group is an object, the object must have a 'pointer'property which is interpreted as described under hostvars above. Furthermore, the object may declare a prefix that will be applied to each value.

                Since pointers are relative to each host's hostvars you must ensure the hostvars get produced by the hostvar section above.

  order         Lists the order in which the groups appear in the final output.

                The key 'hosts' is assumed to be the first member of the list and doesn't need to appear. The 'hosts' group will always be followed by the '_meta' element containing the hostvars; this is an Ansible 1.3+ optimization.

                If omitted, the order will be hosts, then each group in the order they appear under the groups element.

                Group elements are sorted in alphanumeric order.

  host_ip       Specifies by JSON Pointer the source of a host's IP address. Ansible will use the corresponding IP when contacting the host. Defaults to a calculated ip address that prefers the public address if present; otherwise the internal address.

                Since pointers are relative to each host's hostvars you must ensure the hostvars get produced by the hostvar section above.

    `);
};
