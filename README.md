# gce-inventory

A flexible module for creating Ansible dynamic inventories from Google Compute Engine resources.

## Change Log

`0.1.0` 2015-11-28 - published initial npm package.

## Rationale

Since we operate an environment that spans multiple clouds (GCE, AWS, Rackspace) we wanted to be able to dictate the composition of `hostvars` and `groups` when generating our dynamic inventories. Doing so greatly reduces the overhead maintaining our Ansible plays because we have reduced the coupling with the specific cloud provider.

What do we mean by coupling? Ansible's `gce.py` module and its `ec2.py` module are both opinionated about both `hostvars` and `groups`. Notably, both of these markup the inventory in a way that is not meaningful to our automation; a prefix of `ec2_` and `gce_` on variables is cumbersome and requires unnecessary logic in our plays deal with the prefixed variables.

Our own approach enables us to declaritively compose `hostvars` and `groups` into just the information our automation cares about.

### Work in Progress

You should know this module is a work in progress - the development of our custom AWS and Rackspace modules will likely cause an iteration or two on this one.

## Install

This module is written in node.js and uses node's ES6 features; you must have node v4.0+ installed on your system to use this module. [Download and install instructions can be found on the nodejs.org downloads page](https://nodejs.org/en/download/).

```bash
npm install -g gce-inventory
```

Once installed, you'll have a `gce-inventory` command available on the machine.

## Required Options

The `gce-inventory` command line must be able to find an options file in order to query the Google Compute Engine APIs. You can either set an environement variable `GCE_OPTIONS` to the file's full path, or name the file `.gce-options` and put it in your project's working directory or one of the parent directories.

Options files must be formatted as YAML.

The minimal options file identifies your project and credentials:

**`.gce-options`:**
```yaml
---
projectId: test
keyFileName: /home/myname/TEST-xxxxxxxxxx.json
```

* `projectId`   - the name of your project, you can find this on the google console's dashboard
* `keyFileName` - the fully qualified path to a service account file

## Use

With the required options in place, you can run the inventory directly from a terminal in order to test it out and see what data will be provided to Ansible:

```bash
gce-inventory --list
```

The default output might look something like this (pretty-printed and elided):

```json
{
  "_meta": {
    "hostvars": {
      "gc-ctrl-server-02": {
        "zone": "us-central1-c",
        "name": "gc-ctrl-server-02",
        "ansible_ssh_host": "xx.xx.xx.xx"
      },
      "gc-hafs-server-01": {
        "zone": "us-central1-b",
        "name": "gc-hafs-server-01",
        "ansible_ssh_host": "xx.xx.xx.xx"
      },
      "...",
      "gc-app-server-member-mm7n": {
        "zone": "us-central1-f",
        "name": "gc-app-server-member-mm7n",
        "ansible_ssh_host": "xx.xx.xx.xx"
      }
    }
  }
}
```

## Using with Ansible

In order to use the `gce-inventory` command with ansible, you must create an executable shell script somewhere within your project and pass that script to the ansible command line.

For example, create a new shell script and place it in the `inventory` directory under your project:
```
├<ansible-root>
| └─ inventory
|    └─ gce.sh
```

`gce.sh`'s is simple; it forwards all parameters to the installed `gce-inventory` command:

**inventory/gce.sh:**
```bash
#!/bin/sh

gce-inventory $@
```
**Remember to make the script executable!**
```bash
chmod +x inventory/gce.sh
```

After you've got the script ready, run ansible's `setup` module:

```bash
ansible --private-key=~/.ssh/google_compute_engine --become all -i inventory -m setup
```
For those of you not familiar with ansible's command line:

`--private-key=~/.ssh/google_compute_engine` refers to my ssh key authorized for the machines in my inventory. You'll probably have to modify that part of the command.

`--become` tells ansible to `sudo` when executing commands on the hosts.

`all` tells ansible which hosts to run the module on.

`-i inventory` tells ansible to use the inventory located in the `inventory` directory. If you have other static or dynamic inventories in the `inventory` directory, those will be run too!  You may also refer to the script directly, such as `-i inventory/gce.sh`.

`-m setup` tells ansible to run the `setup` module. Ansible's `setup` module interrogates the host and constructs lots of useful host variables; it is a good module to use to see if things are working right.

NOTE: You also must supply [required options when running this command](#user-content-required-options).

## Hostvars

The minimal options file generates an unremarkable list of hosts; chances are good you'll need additional `hostvars` to drive your Ansible playbooks and plays. You can specify additional `hostvars` by adding a `hostvars` section to your options file.

```yaml
---
projectId: test
keyFileName: /home/myname/TEST-xxxxxxxxxx.json

hostvars:
  - status
  - internalIP: /networkInterfaces/0/networkIP
  - externalIP: /networkInterfaces/0/accessConfigs/0/natIP
  - machine_type: /machineType
    captureRe: '[^/]+(?=/$|$)'

```

The `hostvar` options are a list of property descriptors. There are a few different ways of specifying property descriptors:

* `simple-descriptor`: names a property to be copied from the source object to `hostvars` (`status` in the example)
* `pointer-descriptor`: names a property and indicates the JSON-Pointer used to extract the value from the source object (`internalIP` and `externalIP` in the example)
* `transform-descriptor`: same as either `name-descriptor` or `pointer-descriptor` but additionally indicates a transform used on the extracted value before assignment to `hostvars`

The output produced by these options might look something like this (pretty-printed and some items elided):
```json
{
  "_meta": {
    "hostvars": {
      "gc-ctrl-server-02": {
        "zone": "us-central1-c",
        "name": "gc-ctrl-server-02",
        "status": "RUNNING",
        "internalIP": "xx.xx.xx.xx",
        "externalIP": "xx.xx.xx.xx",
        "machine_type": "n1-standard-2",
        "ansible_ssh_host": "xx.xx.xx.xx"
      },
      "...",
      "gc-hafs-server-01": {
        "zone": "us-central1-b",
        "name": "gc-hafs-server-01",
        "status": "TERMINATED",
        "internalIP": "xx.xx.xx.xx",
        "machine_type": "n1-standard-1",
        "ansible_ssh_host": "xx.xx.xx.xx"
      },
      "...",
      "gc-app-server-member-mm7n": {
        "zone": "us-central1-f",
        "name": "gc-app-server-member-mm7n",
        "status": "RUNNING",
        "internalIP": "xx.xx.xx.xx",
        "externalIP": "146.148.72.192",
        "machine_type": "n1-standard-4",
        "ansible_ssh_host": "146.148.72.192"
      },
      "gc-cd-master-00": {
        "zone": "us-central1-f",
        "name": "gc-cd-master-00",
        "status": "RUNNING",
        "internalIP": "xx.xx.xx.xx",
        "externalIP": "xx.xx.xx.xx",
        "machine_type": "n1-standard-2",
        "ansible_ssh_host": "xx.xx.xx.xx"
      }
    }
  }
}
```

Note that while we specified how `status`, `internalIP`, `externalIP` and `machine_type` were derived; `zone`, `name` and `ansible_ssh_host` were added automatically.

## Groups

In Ansible, group membership can indicate the plays that get applied to a particular host. `gce-inventory` enables you to fully specify how `groups` are composed.


The `groups` element in the options file lists the properties of `hostvars` that indicate group membership:

```yaml
---
projectId: test
keyFileName: /home/myname/TEST-xxxxxxxxxx.json

hostvars:
  - status
  - internalIP: /networkInterfaces/0/networkIP
  - externalIP: /networkInterfaces/0/accessConfigs/0/natIP
  - machine_type: /machineType
    captureRe: '[^/]+(?=/$|$)'

groups:
  - zone
  - machine_type
  - status
```
The output produced by these options might look something like this (pretty-printed and some items elided):
```json
{
  "_meta": {
    "hostvars": {
      "gc-ctrl-server-02": {
        "zone": "us-central1-c",
        "name": "gc-ctrl-server-02",
        "status": "RUNNING",
        "internalIP": "xx.xx.xx.xx",
        "externalIP": "xx.xx.xx.xx",
        "machine_type": "n1-standard-2",
        "ansible_ssh_host": "xx.xx.xx.xx"
      },
      "...",
      "gc-cd-master-00": {
        "zone": "us-central1-f",
        "name": "gc-cd-master-00",
        "status": "RUNNING",
        "internalIP": "xx.xx.xx.xx",
        "externalIP": "xx.xx.xx.xx",
        "machine_type": "n1-standard-2",
        "ansible_ssh_host": "xx.xx.xx.xx"
      }
    }
  },
  "us-central1-a": [
    "gc-hafs-server-00"
  ],
  "us-central1-b": [
    "gc-ctrl-server-01",
    "gc-hafs-server-01"
  ],
  "us-central1-c": [
    "gc-ctrl-server-02",
    "gc-hafs-server-02"
  ],
  "us-central1-f": [
    "gc-app-server-member-jorf",
    "gc-app-server-member-ml53",
    "gc-app-server-member-mm7n",
    "gc-cd-master-00",
    "gc-ctrl-server-00",
    "gc-hafs-server-03"
  ],
  "n1-standard-1": [
    "gc-hafs-server-00",
    "gc-hafs-server-01",
    "gc-hafs-server-02",
    "gc-hafs-server-03"
  ],
  "n1-standard-2": [
    "gc-cd-master-00",
    "gc-ctrl-server-00",
    "gc-ctrl-server-01",
    "gc-ctrl-server-02"
  ],
  "n1-standard-4": [
    "gc-app-server-member-jorf",
    "gc-app-server-member-ml53",
    "gc-app-server-member-mm7n"
  ],
  "RUNNING": [
    "gc-app-server-member-jorf",
    "gc-app-server-member-ml53",
    "gc-app-server-member-mm7n",
    "gc-cd-master-00",
    "gc-ctrl-server-00",
    "gc-ctrl-server-01",
    "gc-ctrl-server-02",
    "gc-hafs-server-00",
    "gc-hafs-server-02",
    "gc-hafs-server-03"
  ],
  "TERMINATED": [
    "gc-hafs-server-01"
  ]
}

```

Now that's more interesting output!

### Normalizing Group Names

If you work with multiple cloud providers, you may want more control over group names. For instance the group names in the above output are GCE specific. There are a couple of ways you can control/transform the group names in the output:

* Specify a transform when constructing the `hostvars`,
* Specify a transform when materializing the `groups`.

Here is an example that transforms `hostvars` using a `transform-descriptor`:

```yaml
---
projectId: test
keyFileName: /home/myname/TEST-xxxxxxxxxx.json

hostvars:
  - status:
    transform: lowercase

```

Now the group names will reflect the lower case status (elided):
```json
{
  "...": "...",
  "running": [
    "gc-app-server-member-jorf",
    "gc-app-server-member-ml53",
    "gc-app-server-member-mm7n",
    "gc-cd-master-00",
    "gc-ctrl-server-00",
    "gc-ctrl-server-01",
    "gc-ctrl-server-02",
    "gc-hafs-server-00",
    "gc-hafs-server-02",
    "gc-hafs-server-03"
  ],
  "terminated": [
    "gc-hafs-server-01"
  ]
}
```

We can go further and add some more meaningful info to the group name:

```yaml
---
projectId: test
keyFileName: /home/myname/TEST-xxxxxxxxxx.json

hostvars:
  - status:
    transform: lowercase

groups:
  - status:
    prepend: 'status-'
```

Now the group names are pretty explicit about their purpose/meaning (elided):
```json
{
  "...": "...",
  "status-running": [
    "gc-app-server-member-jorf",
    "gc-app-server-member-ml53",
    "gc-app-server-member-mm7n",
    "gc-cd-master-00",
    "gc-ctrl-server-00",
    "gc-ctrl-server-01",
    "gc-ctrl-server-02",
    "gc-hafs-server-00",
    "gc-hafs-server-02",
    "gc-hafs-server-03"
  ],
  "status-terminated": [
    "gc-hafs-server-01"
  ]
}
```

### Group Vars

There are times when you'll need to set variables on a whole group of hosts. To accomplish this, use `group_vars` in your options file.

The following options file uses `hostvars` to get the host's tags, uses `groups` to group on tags, and adds `group_vars` to the `tag-coreos` group:

```yaml
---
projectId: test
keyFileName: /home/myname/TEST-xxxxxxxxxx.json

hostvars:
  - tags: /tags/items

groups:
  - tags:
    prepend: 'tag-'

group_vars:
  tag-coreos:
    ansible_ssh_user: core
    ansible_python_interpreter: "PATH=/home/core/bin:$PATH python"

```

Provided we have our CoreOS boxes tagged with *coreos*, we now have a way to indicate some CoreOS specific stuff for ansible.

We use this particular strategy; you can find more info about using ansible with CoreOS [on the CoreOS blog](https://coreos.com/blog/managing-coreos-with-ansible/) and [in this handy github repo](https://github.com/defunctzombie/ansible-coreos-bootstrap).

## Debug Mode

Running `gce-inventory` in debug mode can help troubleshoot the options and the processing pipeline. It also enables you to see the raw JSON structure returned from the google API and can help you compose your JSON Pointers and transforms.

```bash
DEBUG=gce* gce-inventory --list
```

### Also Useful

`gce-inventory` doesn't pretty print the JSON that it outputs. You should install [a command line `json` tool](https://github.com/trentm/json):

```bash
npm install -g json
```

Then we simply pipe output to get it pretty printed:

```bash
DEBUG=gce* gce-inventory --list | json
```

## License

This software is covered by the accompanying [MIT style license](https://github.com/LeisureLink/gce-inventory/blob/master/LICENSE.txt).
