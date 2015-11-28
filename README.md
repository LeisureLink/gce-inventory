# gce-inventory

A flexible module for creating Ansible dynamic inventories from Google Compute Engine resources.

## Rationale

Since we operate an environment that spans multiple clouds (GCE, AWS, Rackspace) we wanted to be able to dictate the composition of `hostvars` and `groups` when generating our dynamic inventories. Doing so greatly reduces the overhead maintaining our Ansible plays because we have reduced the coupling with the specific cloud provider.

What do we mean by coupling? Ansible's `gce.py` module and its `ec2.py` module are both opinionated about both `hostvars` and `groups`. Notably, both of these markup the inventory in a way that is not meaningful to our automation; a prefix of `ec2_` and `gce_` on variables is cumbersome and requires unnecessary logic in our plays to normalize inventories spanning multiple clouds.

Our own approach enables us to declaritively compose `hostvars` and `groups` into just the information our automation cares about.

### Work in Progress

You should know this module is a work in progress - the development of our custom AWS and Rackspace modules will likely cause an iteration or two on this one.

## Install

This module is written in node.js and uses node's ES6 features; you must have node v4.0+ installed on your system to use this module. [Download and install instructions can be found on the nodejs.org downloads page](https://nodejs.org/en/download/).

```bash
npm install -g gce-inventory
```

Once installed, you'll have a `gce-inventory` command available from the command line.

## Required Options

The `gce-inventory` command line must be able to find an options file in order to query the Google Compute Engine APIs. You can either set an environement variable `GCE_OPTIONS` to the full path of an options file, or place a file named `.gce-options` in your working directory.

The minimal options file must be formatted as valid YAML data:

** `.gce-options` **
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

The default output might look something like this (pretty-printed):

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
      "gc-hafs-server-02": {
        "zone": "us-central1-c",
        "name": "gc-hafs-server-02",
        "ansible_ssh_host": "xx.xx.xx.xx"
      },
      "gc-ctrl-server-01": {
        "zone": "us-central1-b",
        "name": "gc-ctrl-server-01",
        "ansible_ssh_host": "xx.xx.xx.xx"
      },
      "gc-cd-master-00": {
        "zone": "us-central1-f",
        "name": "gc-cd-master-00",
        "ansible_ssh_host": "xx.xx.xx.xx"
      },
      "gc-app-server-member-jorf": {
        "zone": "us-central1-f",
        "name": "gc-app-server-member-jorf",
        "ansible_ssh_host": "xx.xx.xx.xx"
      },
      "gc-ctrl-server-00": {
        "zone": "us-central1-f",
        "name": "gc-ctrl-server-00",
        "ansible_ssh_host": "xx.xx.xx.xx"
      },
      "gc-hafs-server-03": {
        "zone": "us-central1-f",
        "name": "gc-hafs-server-03",
        "ansible_ssh_host": "xx.xx.xx.xx"
      },
      "gc-hafs-server-00": {
        "zone": "us-central1-a",
        "name": "gc-hafs-server-00",
        "ansible_ssh_host": "xx.xx.xx.xx"
      },
      "gc-app-server-member-ml53": {
        "zone": "us-central1-f",
        "name": "gc-app-server-member-ml53",
        "ansible_ssh_host": "xx.xx.xx.xx"
      },
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

For example, create an `inventory` directory under your project and a new shell script:
```
├<ansible-root>
| └─ inventory
|    └─ gce.sh
```

The content of `gce.sh` is simple; it forwards all parameters to the installed `gce-inventory` command:
**inventory/gce-inventory.sh**
```bash
#!/bin/sh

gce-inventory $@
```
**Remember to make the script executable!**

After you've got the script set up, run the ansible's setup module against all machines in your inventory:

```bash
ansible --private-key=~/.ssh/google_compute_engine --become all -i inventory -m setup
```

NOTE: You also must supply [required options prior to running this command](#user_content_required_options).

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

## Debug Mode

Running `gce-inventory` in debug mode can help troubleshoot the options and the processing pipeline. It also enables you to see the raw JSON structure returned from the google API and can help you compose your JSON Pointers.

```bash
DEBUG=gce* gce-inventory --list
```

## License

This software is covered by the accompanying [MIT style license](https://github.com/LeisureLink/gce-inventory/blob/master/LICENSE.txt).
