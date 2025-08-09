# Guide: Deploying SpecRipper in an Air-Gapped Environment using Docker

This guide provides a step-by-step process for packaging the SpecRipper application into a portable Docker image that can be run on an air-gapped Linux machine (like CentOS 9), even if the image is built on a Windows computer.

This is the most reliable method for your specific workflow.

---

## 1. Why Docker?

The core problem is that `node_modules` installed on Windows are incompatible with Linux. You have already seen errors like "glibc not found" when trying to run Node.js directly. Docker solves this by building your application inside a controlled, portable Linux environment on your Windows machine. 

The final output is a single file containing the application and all its correct Linux dependencies, including the Node.js runtime itself. This means **you do not need to install Node.js on your target Linux machine.**

## 2. Prerequisites

### On Your Windows Development PC:
- **Docker Desktop**: You must install Docker Desktop for Windows. You can download it from the official Docker website. This is the only software you need on this machine.

### On Your Air-Gapped CentOS 9 PC:
- **Docker Engine**: The only prerequisite is that the Docker Engine is installed. For CentOS 9, you should use the official installation instructions for **RHEL 9**. 
- You or a system administrator can follow the official guide here: **[Install Docker Engine on RHEL](https://docs.docker.com/engine/install/rhel/)**.
- If you have already downloaded the correct RPM package for RHEL 9 (e.g., an `x86_64` RPM), you simply need to install it on the machine, typically with a command like `sudo dnf install ./your-docker-file.rpm`.
- **You do NOT need to install Node.js or npm on this machine.**

---

## 3. The Workflow (Step-by-Step)

Follow these steps exactly.

### Step 1: Build the Docker Image (On Your Windows PC)

This step creates the self-contained application package. You only need to do this when you have new code changes to transfer.

1.  **Open a Terminal** (like PowerShell or Command Prompt) in the root directory of your SpecRipper project.
2.  **Run the Build Command**: Execute the following command. This tells Docker to build a new image, naming it `specripper`. The `.` at the end tells it to use the `Dockerfile` in the current directory.
    ```bash
    docker build -t specripper .
    ```
    The first time you run this, it will download the base Node.js Linux image and install all `npm` dependencies. This might take a few minutes. Subsequent builds will be much faster.

### Step 2: Save the Docker Image to a File (On Your Windows PC)

Now, we save the image we just built into a single, portable `.tar` file.

1.  **Run the Save Command**:
    ```bash
    docker save -o specripper-image.tar specripper
    ```
2.  **Check for the file**: A new file named `specripper-image.tar` will be created in your project folder. This single file is all you need to transfer. It contains your app, the Linux `node_modules`, and the Node.js runtime. Its size should be well under your 2GB transfer limit.

### Step 3: Transfer the File

Move the `specripper-image.tar` file from your Windows PC to your air-gapped CentOS 9 machine using your company's approved method (e.g., a secured USB drive).

**Note on using GitHub for transfer:**
If you need to transfer the file via an internet-connected machine and your company policy allows, you can use GitHub Releases. You cannot use a normal `git push` because the `.tar` file is too large.
1. Go to your repository on GitHub.com.
2. Navigate to **"Releases"** and draft a new release.
3. Upload your `specripper-image.tar` file as a release asset.
4. From the internet PC, you can then download this file from the Releases page.

### Step 4: Load the Image (On Your Air-Gapped CentOS 9 PC)

This step "installs" your application package into Docker on the target machine.

1.  **Open a terminal** in the directory where you saved `specripper-image.tar`.
2.  **Run the Load Command**:
    ```bash
    docker load -i specripper-image.tar
    ```
    Docker will load the image and you'll see a confirmation message.

### Step 5: Run the Application (On Your Air-Gapped CentOS 9 PC)

Now you can start the SpecRipper application.

1.  **Run the Run Command**:
    ```bash
    docker run -d --rm -p 9002:9002 --name specripper-app specripper
    ```
    Let's break down this command:
    - `-d`: Runs the container in "detached" mode (in the background).
    - `--rm`: Automatically removes the container when it's stopped.
    - `-p 9002:9002`: Maps port 9002 inside the container to port 9002 on your CentOS machine. This is how you access it.
    - `--name specripper-app`: Gives your running container a memorable name.
    - `specripper`: The name of the image to run.

2.  **Access the Application**: Open a web browser on your CentOS 9 machine and navigate to:
    **[http://localhost:9002](http://localhost:9002)**

The SpecRipper application should now be running. You can now use it to upload your PDF and download the final `chunks.json` file.

### How to Stop the Application

To stop the running container, use its name:
```bash
docker stop specripper-app
```

You have now successfully deployed and run a Windows-built application on a secure Linux environment.
