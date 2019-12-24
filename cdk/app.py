#!/usr/bin/env python3
from aws_cdk import core
from stack.droplet import DropletStack

envDev = core.Environment( region = "us-east-1" )

app = core.App()
DropletStack( app, "droplet", env = envDev )

app.synth()
